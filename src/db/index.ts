import Dexie, { type Table } from 'dexie'
import type { CalendarEvent } from '@/types/event'
import type { Calendar } from '@/types/calendar'
import type { Task } from '@/types/task'

interface DeletedInstance {
  id: string
  eventId: string
  date: string
}

class CalendarDb extends Dexie {
  events!: Table<CalendarEvent>
  calendars!: Table<Calendar>
  deletedInstances!: Table<DeletedInstance>
  tasks!: Table<Task>

  constructor() {
    super('CalendarDb')
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
  }
}

export const db = new CalendarDb()

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
