import { db, openProfile } from '@/db'
import { fetchWithRetry, validateRemoteUrl } from '@/utils/network'
import type { SyncRequest, SyncResponse } from '../../shared/sync'
export type { SyncResponse as SyncPullResult } from '../../shared/sync'

let token: string | null = null
let authenticated = false
let userId = ''

export function getServerUrl(): string { return localStorage.getItem('calendar-sync:serverUrl') || '/api' }
export function setServerUrl(value: string) {
  const url = value.trim().replace(/\/$/, '')
  if (url !== '/api') {
    if (!/^https?:\/\//.test(url)) throw new Error('Enter an HTTPS server URL or /api')
    validateRemoteUrl(url)
  }
  if (url !== getServerUrl()) clearAuthToken()
  localStorage.setItem('calendar-sync:serverUrl', url)
}
export function getAuthToken() { return token }
export function hasAuthToken() { return authenticated }
export function getUserId() { return userId }
export function setAuthToken(value: string) { token = value; authenticated = true }
export function clearAuthToken() {
  token = null
  authenticated = false
  localStorage.removeItem('calendar-sync:authToken')
}
export async function getLastSyncAt() { return (await db.syncMeta.get('lastSyncAt'))?.value || null }
export async function setLastSyncAt(value: string) { await db.syncMeta.put({ key: 'lastSyncAt', value }) }

export async function restoreSession() {
  clearAuthToken()
  if (localStorage.getItem('calendar-sync:signedOut') === 'true') return false
  try {
    const response = await fetchWithRetry(`${getServerUrl()}/auth`, { credentials: 'include' }, 1)
    if (!response.ok) return false
    const session = await response.json() as { userId: string; expiresAt: number }
    userId = session.userId
    await openProfile(getServerUrl(), userId)
    authenticated = true
    await db.syncMeta.put({ key: 'session', value: JSON.stringify({ ...session, server: getServerUrl() }) })
    return true
  } catch {
    const cached = await db.syncMeta.get('session')
    if (!cached) return false
    const session = JSON.parse(cached.value) as { userId: string; expiresAt: number; server: string }
    if (session.expiresAt <= Date.now() || session.server !== getServerUrl()) return false
    userId = session.userId
    authenticated = true
    return true
  }
}

export async function login(password: string, username = 'personal') {
  const response = await fetchWithRetry(`${getServerUrl()}/auth`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }, 1)
  const session = await response.json() as { token: string; userId: string; expiresAt: number; error?: string }
  if (!response.ok) throw new Error(session.error || `HTTP ${response.status}`)
  await openProfile(getServerUrl(), session.userId)
  await db.syncMeta.put({ key: 'session', value: JSON.stringify({ userId: session.userId, expiresAt: session.expiresAt, server: getServerUrl() }) })
  localStorage.removeItem('calendar-sync:signedOut')
  token = session.token
  userId = session.userId
  authenticated = true
  return token
}

export async function logout() {
  localStorage.setItem('calendar-sync:signedOut', 'true')
  try { await fetchWithRetry(`${getServerUrl()}/auth`, { method: 'DELETE', credentials: 'include' }, 1) }
  catch { /* Local sign-out must also work while offline. */ }
  finally { await db.syncMeta.delete('session'); clearAuthToken() }
}

export async function sync(request: SyncRequest): Promise<SyncResponse> {
  const response = await fetchWithRetry(`${getServerUrl()}/sync`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) clearAuthToken()
    const data = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  const result = await response.json() as SyncResponse
  if (result.protocol !== 2 || !Array.isArray(result.records) || !Array.isArray(result.accepted) || !Array.isArray(result.conflicts) || !Number.isSafeInteger(result.cursor)) throw new Error('Invalid sync response')
  return result
}
