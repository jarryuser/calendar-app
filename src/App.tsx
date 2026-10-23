import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginScreen } from '@/components/auth/LoginScreen'
import { db, seedDefaultCalendar } from '@/db'
import { useCalendarStore } from '@/store/calendarStore'
import { restoreSession } from '@/sync/client'
import { startAutoSync, stopAutoSync, subscribe, syncOnce } from '@/sync/engine'

export default function App() {
  const { t } = useTranslation()
  const [ready, setReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    const init = async () => {
      setError(false)
      try {
        const restored = await restoreSession()
        await db.open()
        if (restored) {
          await syncOnce()
          await seedDefaultCalendar()
          await useCalendarStore.getState().load()
        }
        if (active) { setAuthenticated(restored); setReady(true) }
        if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
          void navigator.serviceWorker.register('/sw.js').catch(() => {})
        }
      } catch { if (active) setError(true) }
    }
    void init()
    return () => { active = false }
  }, [attempt])

  useEffect(() => subscribe(state => setAuthenticated(state.authenticated)), [])
  useEffect(() => {
    if (ready && authenticated) {
      startAutoSync()
      return stopAutoSync
    }
  }, [ready, authenticated])

  if (error) return (
    <div role="alert" className="flex flex-col items-center justify-center h-screen gap-4">
      <p>{t('messages.storageFailed')}</p>
      <button onClick={() => { setReady(false); setAttempt(value => value + 1) }}>{t('actions.retry')}</button>
    </div>
  )
  if (!ready) return <div role="status" aria-label={t('actions.loading')} className="flex items-center justify-center h-screen"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
  if (!authenticated) return <LoginScreen onLogin={async () => {
    await syncOnce()
    await seedDefaultCalendar()
    await useCalendarStore.getState().load()
    setAuthenticated(true)
  }} />
  return <AppLayout />
}
