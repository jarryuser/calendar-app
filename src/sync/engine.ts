import { db } from '@/db'
import * as client from './client'

let syncInProgress = false
let lastSyncError: string | null = null
let syncListeners: Array<(state: SyncState) => void> = []
let completeListeners: Array<() => void> = []

export interface SyncState {
  syncing: boolean
  lastSyncAt: string | null
  lastSyncError: string | null
  authenticated: boolean
}

function notifyListeners(state: SyncState) {
  syncListeners.forEach(fn => fn(state))
}

function getState(): SyncState {
  return {
    syncing: syncInProgress,
    lastSyncAt: null,
    lastSyncError,
    authenticated: client.hasAuthToken(),
  }
}

export function subscribe(listener: (state: SyncState) => void): () => void {
  syncListeners.push(listener)
  listener(getState())
  return () => {
    syncListeners = syncListeners.filter(fn => fn !== listener)
  }
}

export function onSyncComplete(cb: () => void): () => void {
  completeListeners.push(cb)
  return () => {
    completeListeners = completeListeners.filter(fn => fn !== cb)
  }
}

export async function collectChanges(lastSyncAt: string | null) {
  const since = lastSyncAt || '1970-01-01T00:00:00.000Z'

  const [events, calendars, tasks, deletedInstances, queue] = await Promise.all([
    db.events.filter(e => e.updatedAt > since).toArray(),
    db.calendars.filter(c => c.updatedAt > since).toArray(),
    db.tasks.filter(t => t.updatedAt > since).toArray(),
    db.deletedInstances.filter(d => d.createdAt > since).toArray(),
    db.syncQueue.toArray(),
  ])

  return {
    events: events as unknown as Record<string, unknown>[],
    eventDeletions: queue.filter(q => q.entityType === 'event').map(q => q.entityId),
    calendars: calendars as unknown as Record<string, unknown>[],
    calendarDeletions: queue.filter(q => q.entityType === 'calendar').map(q => q.entityId),
    tasks: tasks as unknown as Record<string, unknown>[],
    taskDeletions: queue.filter(q => q.entityType === 'task').map(q => q.entityId),
    deletedInstances: deletedInstances as unknown as Record<string, unknown>[],
    deletedInstanceDeletions: queue.filter(q => q.entityType === 'deletedInstance').map(q => q.entityId),
  }
}

function stripItemDeleted<T extends Record<string, unknown>>(item: T): T {
  const { deleted_at, ...rest } = item
  return rest as T
}

export async function applyPull(result: client.SyncPullResult) {
  await db.transaction('rw', [db.events, db.calendars, db.tasks, db.deletedInstances], async () => {
    for (const evt of result.events.upserted) {
      await db.events.put(stripItemDeleted(evt) as never)
    }
    for (const id of result.events.deleted) {
      await db.events.delete(id)
    }

    for (const cal of result.calendars.upserted) {
      await db.calendars.put(stripItemDeleted(cal) as never)
    }
    for (const id of result.calendars.deleted) {
      await db.calendars.delete(id)
    }

    for (const task of result.tasks.upserted) {
      await db.tasks.put(stripItemDeleted(task) as never)
    }
    for (const id of result.tasks.deleted) {
      await db.tasks.delete(id)
    }

    for (const di of result.deletedInstances.upserted) {
      await db.deletedInstances.put(stripItemDeleted(di) as never)
    }
    for (const id of result.deletedInstances.deleted) {
      await db.deletedInstances.delete(id)
    }
  })
}

export async function clearSyncQueue() {
  await db.syncQueue.clear()
}

export async function syncOnce(): Promise<void> {
  if (syncInProgress || !client.hasAuthToken()) return
  syncInProgress = true
  lastSyncError = null
  notifyListeners(getState())

  try {
    const lastSyncAt = await client.getLastSyncAt()
    const changes = await collectChanges(lastSyncAt)
    const result = await client.sync(changes)

    await applyPull(result)
    await clearSyncQueue()
    await client.setLastSyncAt(result.serverTime)

    syncInProgress = false
    notifyListeners(getState())
    completeListeners.forEach(fn => fn())
  } catch (err) {
    syncInProgress = false
    lastSyncError = err instanceof Error ? err.message : 'Sync failed'
    notifyListeners(getState())
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null

export function startAutoSync(intervalMs = 300_000) {
  syncOnce()
  intervalId = setInterval(syncOnce, intervalMs)
}

export function stopAutoSync() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

export async function trackDeletion(
  entityType: 'event' | 'calendar' | 'task' | 'deletedInstance',
  entityId: string,
) {
  await db.syncQueue.add({
    id: crypto.randomUUID(),
    entityType,
    entityId,
    action: 'delete',
    createdAt: new Date().toISOString(),
  })
}
