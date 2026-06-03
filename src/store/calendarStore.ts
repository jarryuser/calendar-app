import { create } from 'zustand'
import { db } from '@/db'
import type { Calendar, CalendarColor } from '@/types/calendar'
import { importICS } from '@/utils/ical'

// Fetch an .ics URL and replace the calendar's events with the parsed result.
async function fetchAndImport(url: string, calendarId: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const icsText = await res.text()
  const parsed = importICS(icsText)
  const now = new Date().toISOString()
  const events = parsed.map(e => ({ ...e, id: crypto.randomUUID(), calendarId, createdAt: now, updatedAt: now }))
  await db.transaction('rw', db.events, async () => {
    await db.events.where('calendarId').equals(calendarId).delete()
    await db.events.bulkAdd(events)
  })
}

interface CalendarStore {
  calendars: Calendar[]
  loading: boolean
  refreshing: string | null
  subscribeError: string | null

  load: () => Promise<void>
  create: (data: { name: string; color: CalendarColor; description?: string }) => Promise<string>
  subscribe: (url: string, name: string, color: CalendarColor) => Promise<string>
  refreshSubscription: (calendarId: string) => Promise<void>
  update: (id: string, data: Partial<Pick<Calendar, 'name' | 'color' | 'isVisible' | 'description'>>) => Promise<void>
  remove: (id: string) => Promise<void>
  toggleVisibility: (id: string) => Promise<void>
  setDefault: (id: string) => Promise<void>
  getDefault: () => Calendar | undefined
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  calendars: [],
  loading: false,
  refreshing: null,
  subscribeError: null,

  load: async () => {
    set({ loading: true })
    const calendars = await db.calendars.orderBy('createdAt').toArray()
    set({ calendars, loading: false })
  },

  create: async ({ name, color, description }) => {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const hasDefault = get().calendars.some(c => c.isDefault)
    const calendar: Calendar = {
      id,
      name,
      color,
      isVisible: true,
      isDefault: !hasDefault,
      description,
      createdAt: now,
      updatedAt: now,
    }
    await db.calendars.add(calendar)
    set(s => ({ calendars: [...s.calendars, calendar] }))
    return id
  },

  subscribe: async (url, name, color) => {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const calendar: Calendar = {
      id, name, color, isVisible: true, isDefault: false,
      subscriptionUrl: url, lastRefreshed: undefined,
      createdAt: now, updatedAt: now,
    }
    // Fetch first; only persist the calendar if the subscription is reachable,
    // so a failed URL doesn't leave a broken empty calendar behind.
    try {
      await fetchAndImport(url, id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch subscription'
      set({ subscribeError: msg })
      // clean up any events that may have been written before the failure
      await db.events.where('calendarId').equals(id).delete()
      throw err
    }
    await db.calendars.add(calendar)
    set(s => ({ calendars: [...s.calendars, calendar], subscribeError: null }))
    return id
  },

  refreshSubscription: async (calendarId) => {
    const cal = get().calendars.find(c => c.id === calendarId)
    if (!cal?.subscriptionUrl) return
    set({ refreshing: calendarId, subscribeError: null })
    try {
      await fetchAndImport(cal.subscriptionUrl, calendarId)
      const now = new Date().toISOString()
      await db.calendars.update(calendarId, { lastRefreshed: now, updatedAt: now })
      set(s => ({
        calendars: s.calendars.map(c => c.id === calendarId ? { ...c, lastRefreshed: now } : c),
      }))
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      const msg = raw.toLowerCase().includes('load failed') || raw.toLowerCase().includes('failed to fetch')
        ? 'Could not reach the calendar URL (the server may block cross-origin requests; try the desktop app)'
        : raw
      set({ subscribeError: msg })
    } finally {
      set({ refreshing: null })
    }
  },

  update: async (id, data) => {
    const now = new Date().toISOString()
    await db.calendars.update(id, { ...data, updatedAt: now })
    set(s => ({
      calendars: s.calendars.map(c =>
        c.id === id ? { ...c, ...data, updatedAt: now } : c
      ),
    }))
  },

  remove: async (id) => {
    await db.transaction('rw', [db.calendars, db.events], async () => {
      await db.calendars.delete(id)
      await db.events.where('calendarId').equals(id).delete()
    })
    set(s => ({ calendars: s.calendars.filter(c => c.id !== id) }))
  },

  toggleVisibility: async (id) => {
    const cal = get().calendars.find(c => c.id === id)
    if (!cal) return
    await get().update(id, { isVisible: !cal.isVisible })
  },

  setDefault: async (id) => {
    const now = new Date().toISOString()
    await db.transaction('rw', db.calendars, async () => {
      await db.calendars.toCollection().modify({ isDefault: false, updatedAt: now })
      await db.calendars.update(id, { isDefault: true, updatedAt: now })
    })
    set(s => ({
      calendars: s.calendars.map(c => ({ ...c, isDefault: c.id === id, updatedAt: now })),
    }))
  },

  getDefault: () => {
    const { calendars } = get()
    return calendars.find(c => c.isDefault) ?? calendars[0]
  },
}))
