import type { Table } from 'dexie'
import { db, type SyncConflict } from '@/db'
import { entities, type Entity, type RecordData } from '../../shared/sync'
import { trackDeletion } from './deletions'
import { useUIStore } from '@/store/uiStore'

interface Backup {
  format: 'calendar-backup'
  version: 1
  createdAt: string
  data: Record<Entity, RecordData[]>
  conflicts?: SyncConflict[]
  preferences: { ui?: string; language?: string }
}
const entityTypes = { events: 'event', calendars: 'calendar', tasks: 'task', deletedInstances: 'deletedInstance' } as const

export async function createBackup(): Promise<string> {
  const data = await db.transaction('r', entities.map(entity => db[entity]), async () => Object.fromEntries(await Promise.all(entities.map(async entity => [entity, await db[entity].toArray()]))))
  return JSON.stringify({ format: 'calendar-backup', version: 1, createdAt: new Date().toISOString(), data, conflicts: await db.syncConflicts.toArray(), preferences: { ui: localStorage.getItem('calendar-ui') || undefined, language: localStorage.getItem('i18nextLng') || undefined } }, null, 2)
}

export function parseBackup(text: string): Backup {
  const backup = JSON.parse(text) as Backup
  if (backup?.format !== 'calendar-backup' || backup.version !== 1 || !backup.data) throw new Error('Invalid backup format')
  for (const entity of entities) {
    const rows = backup.data[entity]
    if (!Array.isArray(rows) || rows.length > 100_000 || rows.some(row => !row || typeof row.id !== 'string' || !row.id)) throw new Error('Invalid backup records')
    if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Duplicate backup IDs')
  }
  if (backup.conflicts && (!Array.isArray(backup.conflicts) || backup.conflicts.some(conflict => !conflict || typeof conflict.id !== 'string' || !entities.includes(conflict.entity) || typeof conflict.entityId !== 'string'))) throw new Error('Invalid conflicts')
  const calendars = new Set(backup.data.calendars.map(row => row.id))
  const events = new Set(backup.data.events.map(row => row.id))
  for (const row of backup.data.calendars) if (typeof row.name !== 'string' || typeof row.isVisible !== 'boolean') throw new Error('Invalid calendar')
  for (const row of [...backup.data.events, ...backup.data.tasks]) {
    if (typeof row.title !== 'string' || !calendars.has(row.calendarId as string)) throw new Error('Invalid calendar reference')
  }
  for (const row of backup.data.events) {
    if (!Number.isFinite(Date.parse(row.start as string)) || !Number.isFinite(Date.parse(row.end as string)) || Date.parse(row.end as string) <= Date.parse(row.start as string) || !Array.isArray(row.reminders)) throw new Error('Invalid event')
    if (row.recurringEventId && !events.has(row.recurringEventId as string)) throw new Error('Invalid series reference')
  }
  for (const row of backup.data.deletedInstances) if (!events.has(row.eventId as string) || typeof row.date !== 'string') throw new Error('Invalid exception')
  if (backup.preferences?.ui) {
    const value = JSON.parse(backup.preferences.ui)?.state
    if (!value || !['month', 'week', 'day', 'agenda', 'year'].includes(value.view)) throw new Error('Invalid preferences')
    const allowed = ['view', 'isDarkTheme', 'designTheme', 'sidebarCollapsed', 'showWeekNumbers', 'timezone']
    if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error('Invalid preference keys')
    for (const key of ['isDarkTheme', 'sidebarCollapsed', 'showWeekNumbers']) if (value[key] !== undefined && typeof value[key] !== 'boolean') throw new Error('Invalid preference type')
    if (!['editorial', 'fantastical'].includes(value.designTheme)) throw new Error('Invalid design theme')
    new Intl.DateTimeFormat('en', { timeZone: value.timezone }).format()
  }
  return backup
}

export async function restoreBackup(text: string) {
  const backup = parseBackup(text)
  await db.transaction('rw', [...entities.map(entity => db[entity]), db.syncQueue, db.syncConflicts], async () => {
    for (const entity of entities) {
      const rows = backup.data[entity]
      const incoming = new Set(rows.map(row => row.id))
      for (const current of await db[entity].toArray()) if (!incoming.has(current.id)) await trackDeletion(entityTypes[entity], current.id)
      await db[entity].clear()
      await (db[entity] as unknown as Table<RecordData>).bulkPut(rows)
      const restored = new Set(rows.map(row => row.id))
      const queue = await db.syncQueue.toArray()
      await db.syncQueue.bulkDelete(queue.filter(item => item.entityType === entityTypes[entity] && restored.has(item.entityId)).map(item => item.id))
    }
    await db.syncConflicts.clear()
    if (backup.conflicts?.length) await db.syncConflicts.bulkPut(backup.conflicts)
  })
  if (backup.preferences?.ui) {
    localStorage.setItem('calendar-ui', backup.preferences.ui)
    await useUIStore.persist.rehydrate()
  }
  if (backup.preferences?.language) localStorage.setItem('i18nextLng', backup.preferences.language)
}
