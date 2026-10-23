import { trackDeletion } from '@/data/deletions'
import { create } from 'zustand'
import { db } from '@/db'
import { expandRecurringEvents, buildRRule } from '@/utils/recurrence'
import { getRangeForView } from '@/utils/dates'
import type { CalendarEvent, EventInstance, RecurringEditScope } from '@/types/event'
import { useUIStore, type ViewType } from './uiStore'
import { fromZonedTime } from 'date-fns-tz'
import { parseISO, format, addDays } from 'date-fns'
import { saveICS } from '@/data/import'

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

let rangeRequest = 0

export const useEventStore = create<EventStore>((set, get) => ({
  events: [],
  instances: [],
  loading: false,
  lastDragUndo: null,

  loadRange: async (date, view) => {
    const request = ++rangeRequest
    set({ loading: true })
    const { timezone } = useUIStore.getState()
    const localRange = getRangeForView(date, view)
    const start = fromZonedTime(localRange.start, timezone)
    const end = fromZonedTime(localRange.end, timezone)
    const firstDay = format(localRange.start, 'yyyy-MM-dd')
    const afterLastDay = format(addDays(localRange.end, 1), 'yyyy-MM-dd')
    const overlaps = (event: CalendarEvent) => event.allDay
      ? event.start.slice(0, 10) < afterLastDay && event.end.slice(0, 10) > firstDay
      : parseISO(event.start) <= end && parseISO(event.end) > start
    try {
      const [regular, masters, exceptionRecords] = await Promise.all([
        db.events.filter(event => !event.recurringEventId && !event.recurrence && overlaps(event)).toArray(),
        db.events.filter(event => !!event.recurrence && !event.recurringEventId).toArray(),
        db.events.filter(event => !!event.recurringEventId && !!event.isException && overlaps(event)).toArray(),
      ])
      const recurringInstances = await expandRecurringEvents(masters, start, end, timezone)

      const regularInstances: EventInstance[] = regular.map(e => ({
        event: e,
        instanceStart: e.start,
        instanceEnd: e.end,
        isRecurring: false,
      }))

      if (request !== rangeRequest) return
      set({
        events: [...regular, ...masters, ...exceptionRecords],
        instances: [...regularInstances, ...recurringInstances],
        loading: false,
      })
    } finally { if (request === rangeRequest) set({ loading: false }) }
  },

  create: async (data) => {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const event: CalendarEvent = { timezone: data.allDay ? undefined : useUIStore.getState().timezone, ...data, id, createdAt: now, updatedAt: now }
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
      const existing = await db.events.where('recurringEventId').equals(id).filter(e => e.exceptionDate === instanceDate).first()
      const exId = existing?.id ?? crypto.randomUUID()
      const duration = parseISO(original.end).getTime() - parseISO(original.start).getTime()
      const newStart = data.start ?? instanceDate
      const endDate = new Date(parseISO(newStart).getTime() + duration)
      const newEnd = data.end ?? (original.allDay ? format(endDate, 'yyyy-MM-dd') : endDate.toISOString())
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
      await db.events.put(exception)
      set(s => ({
        events: [...s.events.filter(e => e.id !== exId), exception],
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
      const cutoff = new Date(parseISO(instanceDate).getTime() - 1)
      const elapsed = original.recurrence.count
        ? buildRRule(original, original.recurrence).between(parseISO(original.start), cutoff, true).length
        : 0
      const newId = crypto.randomUUID()
      const newStart = data.start ?? instanceDate
      const endDate = new Date(parseISO(newStart).getTime() + parseISO(original.end).getTime() - parseISO(original.start).getTime())
      const newEvent: CalendarEvent = {
        ...original, ...data, id: newId, uid: crypto.randomUUID(),
        recurrence: data.recurrence ?? { ...original.recurrence, count: original.recurrence.count ? Math.max(1, original.recurrence.count - elapsed) : undefined },
        start: newStart,
        end: data.end ?? (original.allDay ? format(endDate, 'yyyy-MM-dd') : endDate.toISOString()),
        createdAt: now, updatedAt: now,
        recurringEventId: undefined, exceptionDate: undefined, isException: undefined,
      }
      await db.transaction('rw', [db.events, db.deletedInstances], async () => {
        await db.events.where('recurringEventId').equals(id).filter(event => !!event.exceptionDate && event.exceptionDate >= instanceDate).modify({ recurringEventId: newId, updatedAt: now })
        await db.deletedInstances.where('eventId').equals(id).filter(deletion => deletion.date >= instanceDate).modify({ eventId: newId })
        await db.events.update(id, { recurrence: { ...original.recurrence!, until: cutoff.toISOString() }, updatedAt: now })
        await db.events.add(newEvent)
      })
    }
  },

  remove: async (id, scope = 'all', instanceDate) => {
    const original = get().events.find(e => e.id === id) ?? await db.events.get(id)
    if (!original) return

    if (!original.recurrence || scope === 'all') {
      await db.transaction('rw', [db.events, db.deletedInstances, db.syncQueue], async () => {
        const children = await db.events.where('recurringEventId').equals(id).toArray()
        const deletions = await db.deletedInstances.where('eventId').equals(id).toArray()
        for (const child of children) await trackDeletion('event', child.id)
        for (const deletion of deletions) await trackDeletion('deletedInstance', deletion.id)
        await trackDeletion('event', id)
        if (original.recurringEventId && original.exceptionDate) {
          await db.deletedInstances.add({ id: crypto.randomUUID(), eventId: original.recurringEventId, date: original.exceptionDate, createdAt: new Date().toISOString() })
        }
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
        createdAt: new Date().toISOString(),
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
      const cutoff = new Date(parseISO(instanceDate).getTime() - 1)
      await db.transaction('rw', [db.events, db.deletedInstances, db.syncQueue], async () => {
        for (const exception of await db.events.where('recurringEventId').equals(id).filter(event => !!event.exceptionDate && event.exceptionDate >= instanceDate).toArray()) {
          await trackDeletion('event', exception.id)
          await db.events.delete(exception.id)
        }
        for (const deletion of await db.deletedInstances.where('eventId').equals(id).filter(deletion => deletion.date >= instanceDate).toArray()) {
          await trackDeletion('deletedInstance', deletion.id)
          await db.deletedInstances.delete(deletion.id)
        }
        await db.events.update(id, { recurrence: { ...original.recurrence!, until: cutoff.toISOString() }, updatedAt: now })
      })
    }
  },

  importFromICS: async (icsString, calendarId) => {
    return saveICS(icsString, calendarId)
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
