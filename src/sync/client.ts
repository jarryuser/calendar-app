export interface SyncChangesPush {
  events?: Record<string, unknown>[]
  eventDeletions?: string[]
  calendars?: Record<string, unknown>[]
  calendarDeletions?: string[]
  tasks?: Record<string, unknown>[]
  taskDeletions?: string[]
  deletedInstances?: Record<string, unknown>[]
  deletedInstanceDeletions?: string[]
}

export interface SyncPullResult {
  events: { upserted: Record<string, unknown>[]; deleted: string[] }
  calendars: { upserted: Record<string, unknown>[]; deleted: string[] }
  tasks: { upserted: Record<string, unknown>[]; deleted: string[] }
  deletedInstances: { upserted: Record<string, unknown>[]; deleted: string[] }
  serverTime: string
}

import { db } from '@/db'

export function getServerUrl(): string {
  return localStorage.getItem('calendar-sync:serverUrl') || '/api'
}

export function setServerUrl(url: string): void {
  localStorage.setItem('calendar-sync:serverUrl', url)
}

export function getAuthToken(): string | null {
  return localStorage.getItem('calendar-sync:authToken')
}

export function setAuthToken(token: string): void {
  localStorage.setItem('calendar-sync:authToken', token)
}

export function clearAuthToken(): void {
  localStorage.removeItem('calendar-sync:authToken')
}

export function hasAuthToken(): boolean {
  return !!getAuthToken()
}

export async function getLastSyncAt(): Promise<string | null> {
  const meta = await db.syncMeta.get('lastSyncAt')
  return meta?.value || null
}

export async function setLastSyncAt(value: string): Promise<void> {
  await db.syncMeta.put({ key: 'lastSyncAt', value })
}

export async function login(password: string): Promise<string> {
  const url = `${getServerUrl()}/auth`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  const data = (await res.json()) as { token: string }
  setAuthToken(data.token)
  return data.token
}

export async function sync(changes: SyncChangesPush): Promise<SyncPullResult> {
  const token = getAuthToken()
  if (!token) throw new Error('Not authenticated')

  const lastSyncAt = await getLastSyncAt()
  const url = `${getServerUrl()}/sync`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ lastSyncAt, changes }),
  })

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      clearAuthToken()
      throw new Error('Session expired. Please log in again.')
    }
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(err.error || `Sync failed: HTTP ${res.status}`)
  }

  return res.json() as Promise<SyncPullResult>
}
