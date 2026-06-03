import { useMemo } from 'react'
import {
  parseISO, format, isToday, isSameDay, isSameMonth,
  startOfYear, addMonths, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, eachDayOfInterval, addDays, getISOWeek,
} from 'date-fns'
import { useUIStore } from '@/store/uiStore'
import { useEventStore } from '@/store/eventStore'
import { useCalendarStore } from '@/store/calendarStore'
import { useDateLocale } from '@/i18n/useDateLocale'
import { getEventHex } from '@/utils/colors'
import { dayKeyInTz } from '@/utils/timezone'
import { clsx } from 'clsx'

function getMonthGrid(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end })
}

interface MiniMonthProps {
  monthDate: Date
  eventDays: Map<string, string[]>
  selectedDate: Date
  onDayClick: (day: Date) => void
  showWeekNumbers: boolean
}

function MiniMonth({ monthDate, eventDays, selectedDate, onDayClick, showWeekNumbers }: MiniMonthProps) {
  const locale = useDateLocale()
  const grid = getMonthGrid(monthDate)
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  return (
    <div className="flex flex-col">
      <div className="text-xs font-semibold text-[var(--text-primary)] mb-1.5 text-center">
        {cap(format(monthDate, 'LLLL', { locale }))}
      </div>

      {Array.from({ length: grid.length / 7 }, (_, row) => (
        <div key={row} className="flex">
          {showWeekNumbers && (
            <div className="w-4 flex items-center justify-center">
              <span className="text-[8px] text-[var(--text-tertiary)]">
                {getISOWeek(grid[row * 7])}
              </span>
            </div>
          )}
          <div className="grid grid-cols-7 flex-1">
            {grid.slice(row * 7, row * 7 + 7).map(day => {
              const key = format(day, 'yyyy-MM-dd')
              const inMonth = isSameMonth(day, monthDate)
              const today = isToday(day)
              const isSelected = isSameDay(day, selectedDate)
              const colors = eventDays.get(key) ?? []
              const hasEvents = colors.length > 0

              return (
                <button
                  key={key}
                  onClick={() => inMonth && onDayClick(day)}
                  className={clsx(
                    'relative flex items-center justify-center rounded-full transition-colors',
                    'w-full aspect-square text-[10px] font-medium leading-none',
                    !inMonth && 'opacity-20 pointer-events-none',
                    isSelected && !today && 'bg-[var(--surface-tertiary)] text-[var(--text-primary)]',
                    !today && !isSelected && inMonth && 'hover:bg-[var(--surface-secondary)] text-[var(--text-secondary)]',
                  )}
                  style={today ? { background: 'var(--accent)', color: '#fff' } : undefined}
                >
                  {format(day, 'd')}
                  {hasEvents && !today && (
                    <span
                      className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ backgroundColor: colors[0] }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function YearView() {
  const locale = useDateLocale()
  const { selectedDate, setSelectedDate, setView, showWeekNumbers, timezone } = useUIStore()
  const { instances } = useEventStore()
  const { calendars } = useCalendarStore()

  const currentDate = parseISO(selectedDate)
  const year = currentDate.getFullYear()

  const visibleIds = useMemo(
    () => new Set(calendars.filter(c => c.isVisible).map(c => c.id)),
    [calendars]
  )

  // map of date key → array of event colors
  const eventDays = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const inst of instances) {
      if (!visibleIds.has(inst.event.calendarId)) continue
      const key = dayKeyInTz(inst.instanceStart, timezone)
      const cal = calendars.find(c => c.id === inst.event.calendarId)
      const color = getEventHex(inst.event.color ?? cal?.color)
      if (!map.has(key)) map.set(key, [])
      if (!map.get(key)!.includes(color)) map.get(key)!.push(color)
    }
    return map
  }, [instances, visibleIds, calendars, timezone])

  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => addMonths(startOfYear(currentDate), i)),
    [year]
  )

  const handleDayClick = (day: Date) => {
    setSelectedDate(format(day, 'yyyy-MM-dd'))
    setView('month')
  }

  // weekday letter headers (Mon–Sun)
  const weekdayLetters = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) =>
      format(addDays(weekStart, i), 'EEEEE', { locale })
    )
  }, [locale])

  return (
    <div className="h-full overflow-y-auto p-4 select-none">
      <div className="max-w-5xl mx-auto">
        {/* year label */}
        <div className="text-center text-2xl font-bold text-[var(--text-primary)] mb-6">
          {year}
        </div>

        {/* weekday header row (shared for all months) */}
        <div className="grid grid-cols-3 md:grid-cols-4 gap-6 mb-2">
          {months.slice(0, window.innerWidth >= 768 ? 4 : 3).map((_, i) => (
            <div key={i} className="flex">
              {showWeekNumbers && <div className="w-4 shrink-0" />}
              <div className="grid grid-cols-7 flex-1 mb-0.5">
                {weekdayLetters.map((d, j) => (
                  <div key={j} className="text-center text-[8px] font-medium text-[var(--text-tertiary)] uppercase">
                    {d}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* months grid */}
        <div className="grid grid-cols-3 md:grid-cols-4 gap-6">
          {months.map((monthDate, i) => (
            <div
              key={i}
              className={clsx(
                'rounded-xl p-2 transition-colors',
                isSameMonth(monthDate, currentDate) && 'bg-[var(--surface-secondary)]',
              )}
            >
              <MiniMonth
                monthDate={monthDate}
                eventDays={eventDays}
                selectedDate={currentDate}
                onDayClick={handleDayClick}
                showWeekNumbers={showWeekNumbers}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
