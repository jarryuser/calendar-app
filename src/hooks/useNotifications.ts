import { useEffect, useRef } from 'react'
import { useEventStore } from '@/store/eventStore'
import { useUIStore } from '@/store/uiStore'
import { parseISO, addDays } from 'date-fns'

const NOTIFIED_KEY = 'calendar-notified'

function getNotified(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

function markNotified(key: string) {
  const set = getNotified()
  set.add(key)
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(Array.from(set).slice(-500)))
}

async function showNotification(title: string, body: string) {
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.ready.catch(() => null)
    if (reg) {
      reg.showNotification(title, { body, icon: '/favicon.svg' })
      return
    }
  }
  new Notification(title, { body, icon: '/favicon.svg' })
}

export function useNotifications() {
  const { instances, loadRange } = useEventStore()
  const { selectedDate } = useUIStore()
  const permissionRef = useRef<NotificationPermission>('default')

  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission().then(p => { permissionRef.current = p })
    }
  }, [])

  useEffect(() => {
    const tick = () => {
      if (permissionRef.current !== 'granted') return
      const now = Date.now()
      const notified = getNotified()

      for (const instance of instances) {
        const { event } = instance
        if (!event.reminders?.length) continue

        for (const reminder of event.reminders) {
          const triggerAt = parseISO(instance.instanceStart).getTime() - reminder.minutesBefore * 60_000
          const key = `${event.id}:${instance.instanceStart}:${reminder.minutesBefore}`

          if (!notified.has(key) && now >= triggerAt && now < triggerAt + 90_000) {
            const body = reminder.minutesBefore === 0
              ? 'Starting now'
              : `In ${reminder.minutesBefore} minute${reminder.minutesBefore !== 1 ? 's' : ''}`
            showNotification(event.title, body)
            markNotified(key)
          }
        }
      }
    }

    const interval = setInterval(tick, 30_000)
    return () => clearInterval(interval)
  }, [instances])

  useEffect(() => {
    loadRange(addDays(new Date(), 1), 'agenda')
  }, [selectedDate])
}
