import { useMemo, useState } from 'react'
import { parseISO, format, isSameDay, isSameMonth, isToday, addMonths, subMonths, addDays, startOfWeek, getISOWeek } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useEventStore } from '@/store/eventStore'
import { getMonthGrid } from '@/utils/dates'
import { useDateLocale } from '@/i18n/useDateLocale'

export function MiniCalendar() {
  const locale = useDateLocale()
  const { selectedDate, setSelectedDate, showWeekNumbers } = useUIStore()
  const { instances } = useEventStore()

  const [viewDate, setViewDate] = useState(() => parseISO(selectedDate))

  const grid = useMemo(() => getMonthGrid(viewDate), [viewDate])

  const weekdayLetters = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) =>
      format(addDays(weekStart, i), 'EEEEE', { locale })
    )
  }, [locale])

  const daysWithEvents = useMemo(() => {
    const set = new Set<string>()
    for (const inst of instances) {
      set.add(format(parseISO(inst.instanceStart), 'yyyy-MM-dd'))
    }
    return set
  }, [instances])

  const selected = parseISO(selectedDate)

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between mb-2">
        <span className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
          {(() => { const s = format(viewDate, 'LLLL yyyy', { locale }); return s.charAt(0).toUpperCase() + s.slice(1) })()}
        </span>
        <div className="flex gap-0.5">
          <button
            onClick={() => setViewDate(d => subMonths(d, 1))}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface-tertiary)] text-[var(--text-tertiary)] transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setViewDate(d => addMonths(d, 1))}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface-tertiary)] text-[var(--text-tertiary)] transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* weekday letter headers */}
      <div className="flex mb-1">
        {showWeekNumbers && <div className="w-5 shrink-0" />}
        <div className="grid grid-cols-7 flex-1">
          {weekdayLetters.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-medium text-[var(--text-tertiary)] uppercase">
              {d}
            </div>
          ))}
        </div>
      </div>

      {/* day grid with optional week numbers */}
      {Array.from({ length: grid.length / 7 }, (_, row) => (
        <div key={row} className="flex">
          {showWeekNumbers && (
            <div className="w-5 shrink-0 flex items-center justify-center">
              <span className="text-[9px] font-medium text-[var(--text-tertiary)]">
                {getISOWeek(grid[row * 7])}
              </span>
            </div>
          )}
          <div className="grid grid-cols-7 flex-1">
            {grid.slice(row * 7, row * 7 + 7).map(day => {
          const key = format(day, 'yyyy-MM-dd')
          const inMonth = isSameMonth(day, viewDate)
          const isSelected = isSameDay(day, selected)
          const today = isToday(day)
          const hasEvents = daysWithEvents.has(key)

          return (
            <button
              key={key}
              onClick={() => { setSelectedDate(key); setViewDate(day) }}
              className={`relative w-full aspect-square flex items-center justify-center text-[12px] rounded-full transition-colors font-[480] ${!inMonth ? 'opacity-30' : ''}`}
              style={{
                background: today ? 'var(--accent)' : isSelected ? 'var(--surface-tertiary)' : '',
                color: today ? '#fff' : isSelected ? 'var(--text-primary)' : 'var(--text-primary)',
                fontWeight: (today || isSelected) ? 650 : 480,
              }}
            >
              {format(day, 'd')}
              {hasEvents && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: 'var(--accent)' }} />
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
