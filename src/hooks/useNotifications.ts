import { useEffect, useRef } from 'react'
import i18n from '@/i18n'
import { reportError } from '@/utils/errors'
import { db } from '@/db'
import { expandRecurringEvents } from '@/utils/recurrence'
import { parseISO, addDays, subDays } from 'date-fns'
import type { EventInstance } from '@/types/event'

const notifiedKey = () => `calendar-notified:${db.name}`

function getNotified(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(notifiedKey()) ?? '[]'))
  } catch {
    return new Set()
  }
}

function markNotified(key: string) {
  const set = getNotified()
  set.add(key)
  localStorage.setItem(notifiedKey(), JSON.stringify(Array.from(set).slice(-500)))
}

async function showNotification(title: string, body: string) {
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration().catch(() => undefined)
    if (reg) {
      await reg.showNotification(title, { body, icon: '/favicon.svg' })
      return
    }
  }
  new Notification(title, { body, icon: '/favicon.svg' })
}

// Query upcoming reminder-bearing events directly from the DB, independent of
// whatever range the active view has loaded. Covers the next 25h, expanding
// recurring masters so their reminders fire too.
async function upcomingInstances(): Promise<EventInstance[]> {
  const now = new Date()
  const windowStart = subDays(now, 1)
  const windowEnd = addDays(now, 1)

  const all = await db.events.toArray()
  const regular: EventInstance[] = all
    .filter(e => !e.recurringEventId && !e.recurrence && e.reminders?.length)
    .map(e => ({ event: e, instanceStart: e.start, instanceEnd: e.end, isRecurring: false }))

  const masters = all.filter(e => !!e.recurrence && !e.recurringEventId && e.reminders?.length)
  const recurring = await expandRecurringEvents(masters, windowStart, windowEnd)

  return [...regular, ...recurring]
}

export function useNotifications() {
  const running = useRef(false)

  useEffect(() => {
    const tick = async () => {
      if (running.current || !('Notification' in window) || Notification.permission !== 'granted') return
      running.current = true
      try {
      const now = Date.now()
      const notified = getNotified()
      const instances = await upcomingInstances()

      for (const instance of instances) {
        const { event } = instance
        if (!event.reminders?.length) continue

        for (const reminder of event.reminders) {
          const triggerAt = parseISO(instance.instanceStart).getTime() - reminder.minutesBefore * 60_000
          const key = `${event.id}:${instance.instanceStart}:${reminder.minutesBefore}`

          if (!notified.has(key) && now >= triggerAt && now < triggerAt + 90_000) {
            const body = reminder.minutesBefore === 0
              ? i18n.t('notifications.starting')
              : i18n.t('notifications.inMinutes', { count: reminder.minutesBefore })
            await showNotification(event.title, body)
            markNotified(key)
          }
        }
      }
      } catch (error) { reportError(error) } finally { running.current = false }
    }

    void tick()
    const interval = setInterval(() => { void tick() }, 30_000)
    return () => clearInterval(interval)
  }, [])
}
