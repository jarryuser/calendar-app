import { useEffect, useCallback } from 'react'
import { parseISO, format } from 'date-fns'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { MonthView } from '@/components/views/MonthView'
import { WeekView } from '@/components/views/WeekView'
import { DayView } from '@/components/views/DayView'
import { AgendaView } from '@/components/views/AgendaView'
import { YearView } from '@/components/views/YearView'
import { EventModal } from '@/components/event/EventModal'
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

export function AppLayout() {
  useTheme()
  useKeyboardShortcuts()
  useNotifications()
  const { toast, dismiss } = useToast()

  const { view, selectedDate, setSelectedDate, sidebarCollapsed, mobileMenuOpen, setMobileMenuOpen } = useUIStore()
  const { loadRange } = useEventStore()
  const { load: loadTasks } = useTaskStore()

  useEffect(() => {
    loadTasks()
  }, [])

  useEffect(() => {
    loadRange(parseISO(selectedDate), view)
  }, [selectedDate, view])

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
          <ActiveView />
        </main>
      </div>

      {/* bottom nav — mobile only */}
      <BottomNav />

      <EventModal />
      <EventPopover />
      {toast && <Toast {...toast} onDismiss={dismiss} />}
    </div>
  )
}
