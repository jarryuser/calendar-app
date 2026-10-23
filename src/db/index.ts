import Dexie, { type Table } from 'dexie'
import type { CalendarEvent } from '@/types/event'
import type { Calendar } from '@/types/calendar'
import type { RemoteRecord, RecordData, Entity } from '../../shared/sync'
import type { Task } from '@/types/task'

export interface DeletedInstance {
  id: string
  eventId: string
  date: string
  createdAt: string
}

export interface SyncMeta {
  key: string
  value: string
}

export interface SyncQueueEntry {
  id: string
  entityType: 'event' | 'calendar' | 'task' | 'deletedInstance'
  entityId: string
  action: 'delete'
  createdAt: string
}

export interface SyncVersion extends RemoteRecord { key: string }
export interface SyncConflict {
  id: string
  entity: Entity
  entityId: string
  local: RecordData | null
  remote: RemoteRecord
  createdAt: string
}

export class CalendarDb extends Dexie {
  events!: Table<CalendarEvent>
  calendars!: Table<Calendar>
  deletedInstances!: Table<DeletedInstance>
  tasks!: Table<Task>
  syncMeta!: Table<SyncMeta>
  syncQueue!: Table<SyncQueueEntry>

  syncVersions!: Table<SyncVersion>
  syncConflicts!: Table<SyncConflict>

  constructor(name = 'CalendarDb') {
    super(name)
    this.version(1).stores({
      events: 'id, calendarId, start, end, recurringEventId, exceptionDate',
      calendars: 'id, isDefault',
      deletedInstances: 'id, eventId, date',
    })
    this.version(2).stores({
      events: 'id, calendarId, start, end, recurringEventId, exceptionDate',
      calendars: 'id, isDefault, createdAt',
      deletedInstances: 'id, eventId, date',
    })
    this.version(3).stores({
      events: 'id, calendarId, start, end, recurringEventId, exceptionDate',
      calendars: 'id, isDefault, createdAt',
      deletedInstances: 'id, eventId, date',
      tasks: 'id, calendarId, dueDate, completed, createdAt',
    })
    // v4 kept for existing databases — caldav tables are no longer used in code
    this.version(4).stores({
      events: 'id, calendarId, start, end, recurringEventId, exceptionDate',
      calendars: 'id, isDefault, createdAt',
      deletedInstances: 'id, eventId, date',
      tasks: 'id, calendarId, dueDate, completed, createdAt',
      caldavAccounts: 'id, enabled',
      caldavCalendars: 'calendarId, accountId',
    })
    this.version(5).stores({
      events: 'id, calendarId, start, end, recurringEventId, exceptionDate',
      calendars: 'id, isDefault, createdAt',
      deletedInstances: 'id, eventId, date',
      tasks: 'id, calendarId, dueDate, completed, createdAt',
      syncMeta: 'key',
      syncQueue: 'id, entityType, entityId, createdAt',
    })
    this.version(6).stores({
      syncVersions: 'key, entity, id',
      syncConflicts: 'id, entity, entityId, createdAt',
    })
  }
}

const profile = typeof localStorage === 'undefined' ? null : localStorage.getItem('calendar-sync:profile')
export let db = new CalendarDb(profile || 'CalendarDb')

export async function openProfile(server: string, userId: string) {
  const name = server === '/api' && userId === 'personal' ? 'CalendarDb' : `CalendarDb:${server}:${userId}`
  if (db.name !== name) {
    db.close()
    db = new CalendarDb(name)
  }
  await db.open()
  localStorage.setItem('calendar-sync:profile', name)
}

export async function seedDefaultCalendar() {
  await db.transaction('rw', db.calendars, async () => {
    const count = await db.calendars.count()
    if (count > 0) return
    const now = new Date().toISOString()
    await db.calendars.add({
      id: crypto.randomUUID(),
      name: 'Personal',
      color: 'blue',
      isVisible: true,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    })
  })
}
