import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { db, seedDefaultCalendar } from '@/db'
import { useCalendarStore } from '@/store/calendarStore'

export default function App() {
  const [ready, setReady] = useState(false)

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

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--surface)]">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <AppLayout />
}
