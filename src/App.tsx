import { useEffect, useState } from 'react'
import { parseISO } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginScreen } from '@/components/auth/LoginScreen'
import { db, seedDefaultCalendar } from '@/db'
import { useCalendarStore } from '@/store/calendarStore'
import { useEventStore } from '@/store/eventStore'
import { useTaskStore } from '@/store/taskStore'
import { useUIStore } from '@/store/uiStore'
import { hasAuthToken } from '@/sync/client'
import { startAutoSync, stopAutoSync, syncOnce, onSyncComplete } from '@/sync/engine'

export default function App() {
  const [ready, setReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(hasAuthToken())

  useEffect(() => {
    const init = async () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {})
      }
      try {
        await db.open()
        await seedDefaultCalendar()
        await useCalendarStore.getState().load()
      } catch (e) {
        console.error('Init error:', e)
      }
      setReady(true)
    }
    init()
  }, [])

  useEffect(() => {
    if (ready && authenticated) {
      startAutoSync()
      return () => stopAutoSync()
    }
  }, [ready, authenticated])

  useEffect(() => {
    if (!ready) return
    return onSyncComplete(async () => {
      console.log('[sync] onSyncComplete fired')
      await useCalendarStore.getState().load()
      await useTaskStore.getState().load()
      const calendars = useCalendarStore.getState().calendars
      console.log('[sync] calendars:', calendars.map(c => ({ id: c.id, name: c.name, isVisible: c.isVisible })))
      const { selectedDate, view } = useUIStore.getState()
      const instances = useEventStore.getState().instances
      console.log('[sync] instances count:', instances.length, 'calendars count:', calendars.length)
      console.log('[sync] reloading view:', view, selectedDate)
      useEventStore.getState().loadRange(parseISO(selectedDate), view)
    })
  }, [ready])

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--surface)]">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!authenticated) {
    return <LoginScreen onLogin={() => { setAuthenticated(true); syncOnce() }} />
  }

  return <AppLayout />
}
