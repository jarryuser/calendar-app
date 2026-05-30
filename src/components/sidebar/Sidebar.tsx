import { CalendarDays, Moon, Sun, Feather, Sparkles } from 'lucide-react'
import { MiniCalendar } from './MiniCalendar'
import { CalendarList } from './CalendarList'
import { TaskList } from './TaskList'
import { useUIStore } from '@/store/uiStore'

export function Sidebar() {
  const { isDarkTheme, toggleTheme, designTheme, toggleDesignTheme } = useUIStore()

  return (
    <div
      data-sidebar-theme="dark"
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: 'var(--surface-sidebar)' }}
    >
      {/* brand */}
      <div className="flex items-center gap-2.5 px-5 pt-4 pb-4">
        <CalendarDays size={18} className="text-[var(--text-primary)] shrink-0" strokeWidth={1.8} />
        <span className="font-display text-[17px] font-[650] tracking-[-0.01em] text-[var(--text-primary)]">
          Calendar
        </span>
      </div>

      <div className="px-4">
        <MiniCalendar />
      </div>

      <div className="h-px mx-5 my-3.5" style={{ background: 'var(--border)' }} />

      <div className="px-4 flex-1">
        <CalendarList />
      </div>

      <TaskList />

      {/* mobile-only quick settings — these controls live in the header on desktop */}
      <div className="md:hidden flex items-center gap-1 px-4 py-3 border-t border-[var(--border)] safe-area-bottom">
        {([
          { icon: isDarkTheme ? <Sun size={16} /> : <Moon size={16} />, action: toggleTheme, label: 'Theme' },
          { icon: designTheme === 'editorial' ? <Feather size={16} /> : <Sparkles size={16} />, action: toggleDesignTheme, label: 'Design' },
        ] as const).map(({ icon, action, label }) => (
          <button
            key={label}
            onClick={action}
            className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-[var(--r-sm)] text-[13px] font-[550] text-[var(--text-secondary)] transition-colors"
            style={{ background: 'var(--surface-secondary)' }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
