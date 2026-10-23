import { db, type SyncConflict } from '@/db'
import * as client from './client'
import { entities, type Entity, type Mutation, type RecordData, type RemoteRecord, type SyncResponse } from '../../shared/sync'
export { trackDeletion } from '@/data/deletions'

const entityTypes = { events: 'event', calendars: 'calendar', tasks: 'task', deletedInstances: 'deletedInstance' } as const
export interface SyncState { syncing: boolean; lastSyncAt: string | null; lastSyncError: string | null; authenticated: boolean }
let state: SyncState = { syncing: false, lastSyncAt: null, lastSyncError: null, authenticated: client.hasAuthToken() }
const listeners = new Set<(state: SyncState) => void>()
const completeListeners = new Set<() => void>()
function notify() {
  state = { ...state, authenticated: client.hasAuthToken() }
  listeners.forEach(listener => listener(state))
}
export function subscribe(listener: (state: SyncState) => void) { listeners.add(listener); listener({ ...state, authenticated: client.hasAuthToken() }); return () => { listeners.delete(listener) } }
export function onSyncComplete(listener: () => void) { completeListeners.add(listener); return () => { completeListeners.delete(listener) } }
export function fingerprint(value: unknown): string {
  return JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().filter(key => item[key] !== null && item[key] !== undefined).map(key => [key, item[key]])) : item) || ''
}
const keyFor = (entity: Entity, id: string) => `${entity}:${id}`

export async function collectChanges() {
  const database = db
  return database.transaction('r', [...entities.map(key => database[key]), database.syncVersions, database.syncQueue, database.syncMeta], async () => {
    const versions = new Map((await database.syncVersions.toArray()).map(record => [record.key, record]))
    const queue = await database.syncQueue.toArray()
    const snapshots = new Map<string, RecordData>()
    const mutations: Mutation[] = []
    for (const entity of entities) {
      for (const data of await database[entity].toArray()) {
        const key = keyFor(entity, data.id)
        snapshots.set(key, data as unknown as RecordData)
        const version = versions.get(key)
        if (fingerprint(data) !== fingerprint(version?.data)) mutations.push({ entity, id: data.id, data: data as unknown as RecordData, baseRevision: version?.revision || 0, deleted: false, mutationId: crypto.randomUUID() })
      }
      for (const item of queue.filter(item => item.entityType === entityTypes[entity])) {
        const key = keyFor(entity, item.entityId)
        if (!mutations.some(m => m.entity === entity && m.id === item.entityId)) mutations.push({ entity, id: item.entityId, baseRevision: versions.get(key)?.revision || 0, deleted: true, mutationId: crypto.randomUUID() })
      }
    }
    return { database, mutations: mutations.slice(0, 100), snapshots, queue, cursor: Number((await database.syncMeta.get('cursor'))?.value || 0), hasMore: mutations.length > 100 }
  })
}

export async function applyPull(result: SyncResponse, sent: Awaited<ReturnType<typeof collectChanges>>) {
  const database = sent.database
  if (db !== database) throw new Error('Account changed during synchronization')
  await database.transaction('rw', [...entities.map(key => database[key]), database.syncVersions, database.syncConflicts, database.syncQueue, database.syncMeta], async () => {
    const conflicts = new Map(result.conflicts.map(conflict => [conflict.mutationId, conflict.remote]))
    const applied = new Set(result.accepted.map(record => keyFor(record.entity, record.id)))
    for (const mutation of sent.mutations) {
      const remote = conflicts.get(mutation.mutationId)
      if (remote) {
        const conflict: SyncConflict = { id: mutation.mutationId, entity: mutation.entity, entityId: mutation.id, local: mutation.data || null, remote, createdAt: new Date().toISOString() }
        await database.syncConflicts.put(conflict)
        applied.add(keyFor(remote.entity, remote.id))
      }
    }
    const records = [...result.records, ...result.accepted, ...result.conflicts.map(conflict => conflict.remote)]
    const newest = new Map<string, RemoteRecord>()
    for (const record of records) {
      const key = keyFor(record.entity, record.id)
      if (!newest.has(key) || newest.get(key)!.revision <= record.revision) newest.set(key, record)
    }
    const pending = await database.syncQueue.toArray()
    for (const [key, record] of newest) {
      const version = await database.syncVersions.get(key)
      if (version && version.revision > record.revision) continue
      const current = await database[record.entity].get(record.id) as RecordData | undefined
      const unchanged = fingerprint(current) === fingerprint(sent.snapshots.get(key))
      const localDirty = fingerprint(current) !== fingerprint(version?.data)
      const deletionPending = pending.some(item => item.entityType === entityTypes[record.entity] && item.entityId === record.id)
      if (!applied.has(key) && (localDirty || deletionPending) && fingerprint(current) !== fingerprint(record.data ?? undefined)) continue
      if (unchanged && (applied.has(key) || !deletionPending)) {
        if (record.deleted) await database[record.entity].delete(record.id)
        else if (record.data) await database[record.entity].put(record.data as never)
      }
      await database.syncVersions.put({ key, ...record })
    }
    const processed = new Set(sent.mutations.filter(mutation => applied.has(keyFor(mutation.entity, mutation.id))).map(mutation => keyFor(mutation.entity, mutation.id)))
    await database.syncQueue.bulkDelete(sent.queue.filter(item => {
      const entity = entities.find(entity => entityTypes[entity] === item.entityType)!
      return processed.has(keyFor(entity, item.entityId))
    }).map(item => item.id))
    await database.syncMeta.put({ key: 'cursor', value: String(result.cursor) })
    await database.syncMeta.put({ key: 'lastSyncAt', value: result.serverTime })
  })
}

async function withLease(work: () => Promise<void>) {
  const database = db
  const owner = crypto.randomUUID()
  const leaseKey = 'syncLease'
  const acquire = await database.transaction('rw', database.syncMeta, async () => {
    const existing = await database.syncMeta.get(leaseKey)
    if (existing && JSON.parse(existing.value).expiresAt > Date.now()) return false
    await database.syncMeta.put({ key: leaseKey, value: JSON.stringify({ owner, expiresAt: Date.now() + 90_000 }) })
    return true
  })
  if (!acquire) return
  const heartbeat = setInterval(() => {
    void database.transaction('rw', database.syncMeta, async () => {
      const existing = await database.syncMeta.get(leaseKey)
      if (existing && JSON.parse(existing.value).owner === owner) await database.syncMeta.put({ key: leaseKey, value: JSON.stringify({ owner, expiresAt: Date.now() + 90_000 }) })
    }).catch(() => {})
  }, 20_000)
  try { await work() }
  finally {
    clearInterval(heartbeat)
    await database.transaction('rw', database.syncMeta, async () => {
      const existing = await database.syncMeta.get(leaseKey)
      if (existing && JSON.parse(existing.value).owner === owner) await database.syncMeta.delete(leaseKey)
    }).catch(() => {})
  }
}

let syncing = false
async function performSync() {
  const database = db
  const checkProfile = () => { if (db !== database) throw new Error('Account changed during synchronization') }
  // Bootstrap remote versions before pushing local records from older clients.
  if (!await db.syncMeta.get('protocol2')) {
    let more = true
    while (more) {
      const sent = await collectChanges()
      checkProfile()
      const result = await client.sync({ protocol: 2, cursor: sent.cursor, mutations: [] })
      checkProfile()
      await applyPull(result, { ...sent, mutations: [], queue: [] })
      more = result.hasMore
    }
    await db.syncMeta.put({ key: 'protocol2', value: 'true' })
  }
  let more = true
  while (more && client.hasAuthToken()) {
    const sent = await collectChanges()
    checkProfile()
    const result = await client.sync({ protocol: 2, cursor: sent.cursor, mutations: sent.mutations })
    checkProfile()
    await applyPull(result, sent)
    more = result.hasMore || sent.hasMore
  }
}
export async function syncOnce() {
  if (syncing || !client.hasAuthToken()) return
  syncing = true
  state = { ...state, syncing: true, lastSyncError: null }
  notify()
  try {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      await navigator.locks.request(`calendar-sync:${db.name}`, { ifAvailable: true }, async lock => { if (lock) await performSync() })
    } else await withLease(performSync)
    completeListeners.forEach(listener => listener())
  } catch (error) { state.lastSyncError = error instanceof Error ? error.message : 'Sync failed' }
  finally {
    syncing = false
    state.syncing = false
    state.lastSyncAt = await client.getLastSyncAt().catch(() => null)
    notify()
  }
}
let interval: ReturnType<typeof setInterval> | undefined
export function startAutoSync(milliseconds = 300_000) { stopAutoSync(); void syncOnce(); interval = setInterval(() => void syncOnce(), milliseconds) }
export function stopAutoSync() { clearInterval(interval); interval = undefined }
