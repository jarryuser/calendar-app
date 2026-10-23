import { db } from '@/db'
import { importICS } from '@/utils/ical'
import { trackDeletion } from './deletions'
import type { CalendarEvent } from '@/types/event'

export async function saveICS(text: string, calendarId: string, replace = false) {
  const parsed = importICS(text)
  const now = new Date().toISOString()
  return db.transaction('rw', [db.events, db.deletedInstances, db.syncQueue], async () => {
    const existing = await db.events.where('calendarId').equals(calendarId).toArray()
    const key = (event: { uid?: string; exceptionDate?: string }) => `${event.uid || ''}:${event.exceptionDate || ''}`
    const byUid = new Map(existing.filter(event => event.uid).map(event => [key(event), event]))
    const records: CalendarEvent[] = parsed.map(event => {
      const original = event.uid ? byUid.get(key(event)) : undefined
      return { ...event, id: original?.id || crypto.randomUUID(), calendarId, createdAt: original?.createdAt || now, updatedAt: now }
    })
    const masters = new Map(records.filter(event => !event.exceptionDate).map(event => [event.uid, event.id]))
    for (const event of records) {
      if (event.exceptionDate) event.recurringEventId = masters.get(event.uid)
    }
    if (replace) {
      const ids = new Set(records.map(event => event.id))
      for (const event of existing.filter(event => !ids.has(event.id))) {
        await trackDeletion('event', event.id)
        await db.events.delete(event.id)
        for (const deletion of await db.deletedInstances.where('eventId').equals(event.id).toArray()) {
          await trackDeletion('deletedInstance', deletion.id)
          await db.deletedInstances.delete(deletion.id)
        }
      }
    }
    await db.events.bulkPut(records)
    return records.length
  })
}
