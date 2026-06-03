import { create } from 'zustand'
import { db } from '@/db'
import { expandRecurringEvents } from '@/utils/recurrence'
import { getRangeForView } from '@/utils/dates'
import type { CalendarEvent, EventInstance, RecurringEditScope } from '@/types/event'
import type { ViewType } from './uiStore'
import { parseISO, addDays, formatISO } from 'date-fns'
import { importICS } from '@/utils/ical'

interface UndoEntry {
  eventId: string
  previousStart: string
  previousEnd: string
  scope: RecurringEditScope
  instanceStart?: string
}

interface EventStore {
  events: CalendarEvent[]
  instances: EventInstance[]
  loading: boolean
  lastDragUndo: UndoEntry | null

  loadRange: (date: Date, view: ViewType) => Promise<void>
  create: (data: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  update: (
    id: string,
    data: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>,
    scope?: RecurringEditScope,
    instanceDate?: string,
  ) => Promise<void>
  remove: (id: string, scope?: RecurringEditScope, instanceDate?: string) => Promise<void>
  importFromICS: (icsString: string, calendarId: string) => Promise<number>
  search: (query: string) => Promise<EventInstance[]>
  saveDragUndo: (entry: UndoEntry) => void
  undoLastDrag: () => Promise<void>
  clearDragUndo: () => void
}

export const useEventStore = create<EventStore>((set, get) => ({
  events: [],
  instances: [],
  loading: false,
  lastDragUndo: null,

  loadRange: async (date, view) => {
    set({ loading: true })
    const { start, end } = getRangeForView(date, view)

    const [regular, masters, exceptionRecords] = await Promise.all([
      db.events
        .where('start')
        .between(start.toISOString(), end.toISOString(), true, true)
        .filter(e => !e.recurringEventId && !e.recurrence)
        .toArray(),
      db.events
        .filter(e => !!e.recurrence && !e.recurringEventId)
        .toArray(),
      // Exception records need to be in events[] so update() can find them
      db.events
        .where('start')
        .between(start.toISOString(), end.toISOString(), true, true)
        .filter(e => !!e.recurringEventId && !!e.isException)
        .toArray(),
    ])

    const recurringInstances = await expandRecurringEvents(masters, start, end)

    const regularInstances: EventInstance[] = regular.map(e => ({
      event: e,
      instanceStart: e.start,
      instanceEnd: e.end,
      isRecurring: false,
    }))

    set({
      events: [...regular, ...masters, ...exceptionRecords],
      instances: [...regularInstances, ...recurringInstances],
      loading: false,
    })
  },

  create: async (data) => {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const event: CalendarEvent = { ...data, id, createdAt: now, updatedAt: now }
    await db.events.add(event)
    set(s => ({
      events: [...s.events, event],
      instances: [
        ...s.instances,
        { event, instanceStart: event.start, instanceEnd: event.end, isRecurring: false },
      ],
    }))
    return id
  },

  update: async (id, data, scope = 'all', instanceDate) => {
    const now = new Date().toISOString()
    // Exception records may not be in events[] after loadRange — look up from DB as fallback
    const original = get().events.find(e => e.id === id) ?? (await db.events.get(id)) ?? null
    if (!original) return

    if (!original.recurrence || scope === 'all') {
      await db.events.update(id, { ...data, updatedAt: now })
      set(s => ({
        events: s.events.map(e => e.id === id ? { ...e, ...data, updatedAt: now } : e),
        instances: s.instances.map(i => {
          if (i.event.id !== id || i.isRecurring) return i
          const d = data as Partial<CalendarEvent>
          return {
            ...i,
            instanceStart: d.start ?? i.instanceStart,
            instanceEnd: d.end ?? i.instanceEnd,
            event: { ...i.event, ...data, updatedAt: now },
          }
        }),
      }))
      return
    }

    if (scope === 'this' && instanceDate) {
      // создаём исключение для конкретного экземпляра.
      // Исключение - это материализованный единичный экземпляр, поэтому оно
      // НЕ должно нести recurrence (иначе повторное редактирование породит
      // вложенное исключение с неправильным recurringEventId).
      const exId = crypto.randomUUID()
      const duration = parseISO(original.end).getTime() - parseISO(original.start).getTime()
      const newStart = data.start ?? instanceDate
      const newEnd = data.end ?? new Date(parseISO(newStart).getTime() + duration).toISOString()
      const exception: CalendarEvent = {
        ...original,
        ...data,
        id: exId,
        start: newStart,
        end: newEnd,
        recurrence: undefined,
        recurringEventId: id,
        exceptionDate: instanceDate,
        isException: true,
        createdAt: now,
        updatedAt: now,
      }
      await db.events.add(exception)
      set(s => ({
        events: [...s.events, exception],
        // отражаем правку сразу: заменяем экземпляр в instances
        instances: s.instances.map(i =>
          i.event.id === id && i.instanceStart === instanceDate
            ? { event: exception, instanceStart: newStart, instanceEnd: newEnd, isRecurring: true }
            : i
        ),
      }))
      return
    }

    if (scope === 'thisAndFollowing' && instanceDate) {
      // обрезаем оригинал до предыдущего дня
      const prevDay = addDays(parseISO(instanceDate), -1)
      await db.events.update(id, {
        recurrence: { ...original.recurrence!, until: formatISO(prevDay, { representation: 'date' }) },
        updatedAt: now,
      })
      // создаём новый мастер начиная с instanceDate
      const newId = crypto.randomUUID()
      const newEvent: CalendarEvent = {
        ...original,
        ...data,
        id: newId,
        start: data.start ?? instanceDate,
        createdAt: now,
        updatedAt: now,
      }
      delete (newEvent as Partial<CalendarEvent>).recurringEventId
      delete (newEvent as Partial<CalendarEvent>).exceptionDate
      delete (newEvent as Partial<CalendarEvent>).isException
      await db.events.add(newEvent)
    }
  },

  remove: async (id, scope = 'all', instanceDate) => {
    const original = get().events.find(e => e.id === id)
    if (!original) return

    if (!original.recurrence || scope === 'all') {
      await db.transaction('rw', [db.events, db.deletedInstances], async () => {
        await db.events.delete(id)
        await db.events.where('recurringEventId').equals(id).delete()
        await db.deletedInstances.where('eventId').equals(id).delete()
      })
      set(s => ({
        events: s.events.filter(e => e.id !== id && e.recurringEventId !== id),
        instances: s.instances.filter(i => i.event.id !== id),
      }))
      return
    }

    if (scope === 'this' && instanceDate) {
      await db.deletedInstances.add({
        id: crypto.randomUUID(),
        eventId: id,
        date: instanceDate,
      })
      set(s => ({
        instances: s.instances.filter(
          i => !(i.event.id === id && i.instanceStart === instanceDate)
        ),
      }))
      return
    }

    if (scope === 'thisAndFollowing' && instanceDate) {
      const now = new Date().toISOString()
      const prevDay = addDays(parseISO(instanceDate), -1)
      await db.events.update(id, {
        recurrence: { ...original.recurrence!, until: formatISO(prevDay, { representation: 'date' }) },
        updatedAt: now,
      })
    }
  },

  importFromICS: async (icsString, calendarId) => {
    const parsed = importICS(icsString)
    const now = new Date().toISOString()

    // De-duplicate by UID within this calendar: update existing events,
    // insert new ones. Avoids duplicate copies when re-importing the same file.
    const existing = await db.events.where('calendarId').equals(calendarId).toArray()
    const byUid = new Map(existing.filter(e => e.uid).map(e => [e.uid!, e]))

    const toAdd: CalendarEvent[] = []
    const toUpdate: CalendarEvent[] = []

    for (const e of parsed) {
      const match = e.uid ? byUid.get(e.uid) : undefined
      if (match) {
        toUpdate.push({ ...match, ...e, id: match.id, calendarId, updatedAt: now })
      } else {
        toAdd.push({ ...e, id: crypto.randomUUID(), calendarId, createdAt: now, updatedAt: now })
      }
    }

    await db.transaction('rw', db.events, async () => {
      if (toAdd.length) await db.events.bulkAdd(toAdd)
      for (const ev of toUpdate) await db.events.put(ev)
    })
    set(s => {
      const updatedIds = new Set(toUpdate.map(e => e.id))
      return {
        events: [...s.events.filter(e => !updatedIds.has(e.id)), ...toUpdate, ...toAdd],
      }
    })
    return toAdd.length + toUpdate.length
  },

  search: async (query) => {
    if (!query.trim()) return []
    const lower = query.toLowerCase()
    const events = await db.events
      .filter(e =>
        e.title.toLowerCase().includes(lower) ||
        (e.description ?? '').toLowerCase().includes(lower) ||
        (e.location ?? '').toLowerCase().includes(lower)
      )
      .limit(50)
      .toArray()
    return events.map(e => ({
      event: e,
      instanceStart: e.start,
      instanceEnd: e.end,
      isRecurring: !!e.recurringEventId,
    }))
  },

  saveDragUndo: (entry) => set({ lastDragUndo: entry }),
  clearDragUndo: () => set({ lastDragUndo: null }),

  undoLastDrag: async () => {
    const { lastDragUndo, update } = get()
    if (!lastDragUndo) return
    await update(
      lastDragUndo.eventId,
      { start: lastDragUndo.previousStart, end: lastDragUndo.previousEnd },
      lastDragUndo.scope,
      lastDragUndo.instanceStart,
    )
    set({ lastDragUndo: null })
  },
}))
