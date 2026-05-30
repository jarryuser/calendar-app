import { CalendarDays, CalendarRange, CalendarCheck, List, CalendarFold } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUIStore, type ViewType } from '@/store/uiStore'

const NAV_ITEMS: { view: ViewType; icon: React.ElementType; key: string }[] = [
  { view: 'month', icon: CalendarDays, key: 'header.month' },
  { view: 'week', icon: CalendarRange, key: 'header.week' },
  { view: 'day', icon: CalendarCheck, key: 'header.day' },
  { view: 'agenda', icon: List, key: 'header.agenda' },
  { view: 'year', icon: CalendarFold, key: 'header.year' },
]

export function BottomNav() {
  const { t } = useTranslation()
  const { view, setView } = useUIStore()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface)] border-t border-[var(--border)] safe-area-bottom flex" style={{ height: '56px' }}>
      {NAV_ITEMS.map(({ view: v, icon: Icon, key }) => (
        <button
          key={v}
          onClick={() => setView(v)}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors"
          style={{ color: view === v ? 'var(--accent)' : 'var(--text-tertiary)' }}
        >
          <Icon size={20} strokeWidth={view === v ? 2.5 : 1.5} />
          <span>{t(key)}</span>
        </button>
      ))}
    </nav>
  )
}
