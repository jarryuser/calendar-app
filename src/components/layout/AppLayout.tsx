import { useEffect, useCallback, lazy, Suspense } from 'react'
import { parseISO, format } from 'date-fns'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { liveQuery } from 'dexie'
import { reportError } from '@/utils/errors'
import { useCalendarStore } from '@/store/calendarStore'
import { MonthView } from '@/components/views/MonthView'
import { EventPopover } from '@/components/event/EventPopover'
import { Toast, useToast } from '@/components/ui/Toast'
import { useUIStore } from '@/store/uiStore'
import { useEventStore } from '@/store/eventStore'
import { useTaskStore } from '@/store/taskStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useTheme } from '@/hooks/useTheme'
import { useNotifications } from '@/hooks/useNotifications'
import { useSwipe } from '@/hooks/useSwipe'
import { navigatePeriod } from '@/utils/dates'
import { clsx } from 'clsx'

const EventModal = lazy(() => import('@/components/event/EventModal').then(module => ({ default: module.EventModal })))
const WeekView = lazy(() => import('@/components/views/WeekView').then(module => ({ default: module.WeekView })))
const DayView = lazy(() => import('@/components/views/DayView').then(module => ({ default: module.DayView })))
const AgendaView = lazy(() => import('@/components/views/AgendaView').then(module => ({ default: module.AgendaView })))
const YearView = lazy(() => import('@/components/views/YearView').then(module => ({ default: module.YearView })))

export function AppLayout() {
  useTheme()
  useKeyboardShortcuts()
  useNotifications()
  const { toast, dismiss } = useToast()

  const { view, selectedDate, setSelectedDate, sidebarCollapsed, mobileMenuOpen, setMobileMenuOpen, timezone, isEventModalOpen } = useUIStore()
  const { loadRange } = useEventStore()
  const { load: loadTasks } = useTaskStore()

  useEffect(() => {
    const subscriptions = [
      liveQuery(() => loadRange(parseISO(selectedDate), view)).subscribe({ error: reportError }),
      liveQuery(() => loadTasks()).subscribe({ error: reportError }),
      liveQuery(() => useCalendarStore.getState().load()).subscribe({ error: reportError }),
    ]
    return () => subscriptions.forEach(subscription => subscription.unsubscribe())
  }, [selectedDate, view, timezone, loadRange, loadTasks])

  // close the mobile drawer whenever navigation changes (date / view)
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [selectedDate, view])

  const navigate = useCallback((dir: 1 | -1) => {
    setSelectedDate(format(navigatePeriod(parseISO(selectedDate), view, dir), 'yyyy-MM-dd'))
  }, [selectedDate, view])

  const swipeHandlers = useSwipe(
    () => navigate(1),
    () => navigate(-1),
  )

  const views = {
    month: MonthView,
    week: WeekView,
    day: DayView,
    agenda: AgendaView,
    year: YearView,
  }
  const ActiveView = views[view]

  return (
    <div className="flex flex-col h-screen bg-[var(--surface)] text-[var(--text-primary)]">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* desktop sidebar — collapsible */}
        <aside
          className={clsx(
            'transition-all duration-200 overflow-hidden shrink-0 hidden md:block',
            sidebarCollapsed ? 'md:w-0' : 'md:w-72',
          )}
          style={{ borderRight: '1px solid var(--border)' }}
        >
          <Sidebar />
        </aside>

        {/* mobile drawer + backdrop */}
        <div className="md:hidden">
          {/* backdrop — above bottom nav (z-50) so it dims everything */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className={clsx(
              'fixed inset-0 z-[55] bg-black/50 transition-opacity duration-200',
              mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
            )}
          />
          {/* drawer — above backdrop & bottom nav */}
          <aside
            className={clsx(
              'fixed top-0 bottom-0 left-0 z-[60] w-[280px] max-w-[82vw] shadow-2xl transition-transform duration-200 ease-out',
              mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            <Sidebar />
          </aside>
        </div>

        {/* main area — swipe to navigate on touch devices */}
        <main
          className="flex-1 overflow-hidden pb-[56px] md:pb-0"
          {...swipeHandlers}
        >
          <Suspense fallback={<div role="status" className="p-4">…</div>}><ActiveView /></Suspense>
        </main>
      </div>

      {/* bottom nav — mobile only */}
      <BottomNav />

      {isEventModalOpen && <Suspense fallback={null}><EventModal /></Suspense>}
      <EventPopover />
      {toast && <Toast key={toast.id} {...toast} onDismiss={dismiss} />}
    </div>
  )
}
