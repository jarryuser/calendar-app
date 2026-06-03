import { useMemo } from 'react'
import { parseISO, format, isToday, addDays } from 'date-fns'
import { MapPin, Clock, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '@/store/uiStore'
import { useEventStore } from '@/store/eventStore'
import { useCalendarStore } from '@/store/calendarStore'
import { useTaskStore } from '@/store/taskStore'
import { getEventHex } from '@/utils/colors'
import { dayKeyInTz } from '@/utils/timezone'
import { useDateLocale } from '@/i18n/useDateLocale'

export function AgendaView() {
  const { t } = useTranslation()
  const locale = useDateLocale()
  const { selectedDate, openPopover, setSelectedDate, timezone } = useUIStore()
  const { instances } = useEventStore()
  const { calendars } = useCalendarStore()
  const { tasks, toggle: toggleTask } = useTaskStore()

  const visibleIds = useMemo(() => new Set(calendars.filter(c => c.isVisible).map(c => c.id)), [calendars])

  const grouped = useMemo(() => {
    const start = parseISO(selectedDate)
    const groups = new Map<string, typeof instances>()
    for (let i = 0; i < 60; i++) {
      const day = addDays(start, i)
      groups.set(format(day, 'yyyy-MM-dd'), [])
    }
    for (const inst of instances) {
      if (!visibleIds.has(inst.event.calendarId)) continue
      const key = dayKeyInTz(inst.instanceStart, timezone)
      groups.get(key)?.push(inst)
    }
    for (const [, arr] of groups) {
      arr.sort((a, b) => {
        if (a.event.allDay !== b.event.allDay) return a.event.allDay ? -1 : 1
        return a.instanceStart.localeCompare(b.instanceStart)
      })
    }
    return Array.from(groups.entries()).filter(([, arr]) => arr.length > 0)
  }, [instances, visibleIds, selectedDate, timezone])

  const tasksByDay = useMemo(() => {
    const map = new Map<string, typeof tasks>()
    for (const task of tasks) {
      if (!task.dueDate) continue
      const key = task.dueDate.slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(task)
    }
    return map
  }, [tasks])

  if (grouped.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-tertiary)] text-sm">
        {t('views.noUpcomingEvents')}
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full">
      {grouped.map(([dateKey, dayInstances]) => {
        const day = parseISO(dateKey)
        const today = isToday(day)

        return (
          <div key={dateKey} className="flex border-b border-[var(--border)]">
            <div
              className="w-20 shrink-0 px-3 pt-4 pb-2 cursor-pointer hover:bg-[var(--surface-secondary)] transition-colors"
              onClick={() => setSelectedDate(dateKey)}
            >
              <div className="text-xs font-medium uppercase" style={{ color: today ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                {format(day, 'EEE', { locale })}
              </div>
              <div className="text-2xl font-bold mt-0.5" style={{ color: today ? 'var(--accent)' : 'var(--text-primary)' }}>
                {format(day, 'd')}
              </div>
              <div className="text-xs text-[var(--text-tertiary)]">{format(day, 'LLL', { locale })}</div>
            </div>

            <div className="flex-1 py-2 space-y-1.5 pr-4">
              {dayInstances.map((inst, i) => {
                const color = inst.event.color ?? calendars.find(c => c.id === inst.event.calendarId)?.color
                const hex = getEventHex(color)
                return (
                  <div
                    key={`${inst.event.id}-${i}`}
                    onClick={e => openPopover(inst.event.id, inst.instanceStart, e.currentTarget)}
                    className="flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-[var(--surface-secondary)] transition-colors"
                  >
                    <div className="w-1 self-stretch rounded-full shrink-0 mt-0.5" style={{ backgroundColor: hex }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-[var(--text-primary)] truncate">{inst.event.title}</div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {!inst.event.allDay && (
                          <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                            <Clock size={11} />
                            {format(parseISO(inst.instanceStart), 'h:mma')}
                            {' - '}
                            {format(parseISO(inst.instanceEnd), 'h:mma')}
                          </span>
                        )}
                        {inst.event.allDay && (
                          <span className="text-xs text-[var(--text-secondary)]">{t('views.allDay')}</span>
                        )}
                        {inst.event.location && (
                          <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)] truncate">
                            <MapPin size={11} />
                            {inst.event.location}
                          </span>
                        )}
                        {inst.isRecurring && (
                          <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                            <RefreshCw size={10} />
                          </span>
                        )}
                      </div>
                      {inst.event.description && (
                        <div className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate">{inst.event.description}</div>
                      )}
                    </div>
                  </div>
                )
              })}
              {(tasksByDay.get(dateKey) ?? []).map(task => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-[var(--surface-secondary)] transition-colors ${task.completed ? 'opacity-50' : ''}`}
                >
                  <div className="w-1 self-stretch rounded-full shrink-0 mt-0.5 bg-[var(--border-strong)]" />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`shrink-0 w-3.5 h-3.5 rounded border-2 ${task.completed ? 'bg-[var(--text-tertiary)] border-[var(--text-tertiary)]' : 'border-[var(--text-tertiary)]'}`} />
                    <span className={`text-sm text-[var(--text-secondary)] truncate ${task.completed ? 'line-through' : ''}`}>{task.title}</span>
                    <span className="ml-auto text-[10px] text-[var(--text-tertiary)] shrink-0">{t('tasks.title')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
