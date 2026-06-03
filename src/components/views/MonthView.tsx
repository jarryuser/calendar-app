import { useMemo, useState } from 'react'
import {
  parseISO, format, isSameMonth, isToday, startOfDay,
  addDays, startOfWeek, differenceInDays, getISOWeek,
} from 'date-fns'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, closestCenter,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { useUIStore } from '@/store/uiStore'
import { useEventStore } from '@/store/eventStore'
import { useCalendarStore } from '@/store/calendarStore'
import { useTaskStore } from '@/store/taskStore'
import type { Task } from '@/types/task'
import { getMonthGrid } from '@/utils/dates'
import { getEventHex } from '@/utils/colors'
import { dayKeyInTz } from '@/utils/timezone'
import { useDateLocale } from '@/i18n/useDateLocale'
import type { EventInstance, RecurringEditScope } from '@/types/event'
import { clsx } from 'clsx'

function EventChip({
  instance,
  onClick,
  isHidden,
}: {
  instance: EventInstance
  onClick: (el: Element) => void
  isHidden: boolean
}) {
  const { calendars } = useCalendarStore()
  const calendar = calendars.find(c => c.id === instance.event.calendarId)
  const color = instance.event.color ?? calendar?.color
  const hex = getEventHex(color)

  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `ev-${instance.event.id}-${instance.instanceStart}`,
    data: { inst: instance },
  })

  if (instance.event.allDay) {
    return (
      <button
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={e => { e.stopPropagation(); onClick(e.currentTarget) }}
        className="chip-bar allday w-full cursor-grab active:cursor-grabbing"
        style={{ '--c': hex, opacity: isHidden ? 0 : 1, touchAction: 'none' } as React.CSSProperties}
      >
        <span className="chip-bar-label">{instance.event.title}</span>
      </button>
    )
  }

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={e => { e.stopPropagation(); onClick(e.currentTarget) }}
      className="chip-bar w-full cursor-grab active:cursor-grabbing"
      style={{ '--c': hex, opacity: isHidden ? 0 : 1, touchAction: 'none' } as React.CSSProperties}
    >
      <span className="chip-bar-rail" style={{ background: hex }} />
      <span className="chip-bar-label">{instance.event.title}</span>
      <span className="chip-bar-time">{format(parseISO(instance.instanceStart), 'h:mma')}</span>
    </button>
  )
}


function DroppableCell({
  dayKey,
  inMonth,
  today,
  day,
  dayInstances,
  maxVisible,
  expandedCell,
  draggingKey,
  dayTasks,
  onTaskToggle,
  onCellClick,
  onExpandClick,
  onEventClick,
}: {
  dayKey: string
  inMonth: boolean
  today: boolean
  day: Date
  dayInstances: EventInstance[]
  maxVisible: number
  expandedCell: string | null
  draggingKey: string | null
  dayTasks: Task[]
  onTaskToggle: (id: string) => void
  onCellClick: () => void
  onExpandClick: (key: string) => void
  onEventClick: (inst: EventInstance, el: Element) => void
}) {
  const { t } = useTranslation()
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayKey}`,
    data: { date: dayKey },
  })

  const isExpanded = expandedCell === dayKey
  const hidden = !isExpanded && dayInstances.length > maxVisible ? dayInstances.length - maxVisible : 0
  const visible = isExpanded ? dayInstances : dayInstances.slice(0, maxVisible)

  return (
    <div
      ref={setNodeRef}
      onClick={onCellClick}
      className={clsx(
        'p-1.5 min-h-[100px] cursor-pointer transition-colors overflow-hidden',
        !inMonth && 'opacity-[var(--out-fade)]',
      )}
      style={{
        borderRight: '1px solid var(--grid-soft)',
        borderBottom: '1px solid var(--grid-soft)',
        background: isOver ? 'var(--hover)' : (!inMonth ? 'var(--surface-secondary)' : 'transparent'),
      }}
      onMouseEnter={e => { if (!isOver) e.currentTarget.style.background = 'var(--hover)' }}
      onMouseLeave={e => { e.currentTarget.style.background = isOver ? 'var(--hover)' : (!inMonth ? 'var(--surface-secondary)' : 'transparent') }}
    >
      {/* day number — right aligned per design */}
      <div className="flex justify-end mb-1">
        <span
          className="text-[12.5px] font-[550] min-w-[22px] text-center px-1 py-0.5 rounded-full leading-none transition-colors"
          style={{
            background: today ? 'var(--accent)' : 'transparent',
            color: today ? '#fff' : 'var(--text-primary)',
            fontWeight: today ? 700 : 550,
          }}
        >
          {format(day, 'd')}
        </span>
      </div>
      <div className="space-y-0.5">
        {visible.map((inst, i) => (
          <EventChip
            key={`${inst.event.id}-${i}`}
            instance={inst}
            onClick={el => onEventClick(inst, el)}
            isHidden={draggingKey === `${inst.event.id}-${inst.instanceStart}`}
          />
        ))}
        {hidden > 0 && (
          <button
            onClick={e => { e.stopPropagation(); onExpandClick(isExpanded ? '' : dayKey) }}
            className="w-full text-left px-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex items-center gap-0.5"
          >
            <ChevronRight size={10} />
            {t('views.moreEvents', { count: hidden })}
          </button>
        )}
        {dayTasks.slice(0, 2).map(task => (
          <button
            key={task.id}
            onClick={e => { e.stopPropagation(); onTaskToggle(task.id) }}
            className={`w-full text-left px-1.5 py-0.5 rounded text-xs leading-5 flex items-center gap-1 transition-opacity hover:opacity-80 ${task.completed ? 'opacity-50' : ''}`}
            style={{ border: '1px dashed var(--border-strong)', color: 'var(--text-secondary)' }}
          >
            <span className={`shrink-0 w-2.5 h-2.5 rounded-sm border ${task.completed ? 'bg-[var(--text-tertiary)] border-[var(--text-tertiary)]' : 'border-[var(--text-tertiary)]'}`} />
            <span className={`truncate ${task.completed ? 'line-through' : ''}`}>{task.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function MonthView() {
  const locale = useDateLocale()
  const { selectedDate, setSelectedDate, openNewEvent, openPopover, showWeekNumbers, timezone } = useUIStore()
  const { instances, update, loadRange } = useEventStore()
  const { calendars } = useCalendarStore()
  const { tasks, toggle: toggleTask } = useTaskStore()
  const { view } = useUIStore()
  const [expandedCell, setExpandedCell] = useState<string | null>(null)
  const [activeInst, setActiveInst] = useState<EventInstance | null>(null)
  // draggingKey stays set until update() completes so the chip stays hidden
  const [draggingKey, setDraggingKey] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const currentDate = parseISO(selectedDate)
  const grid = useMemo(() => getMonthGrid(currentDate), [selectedDate])

  const weekdayLabels = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) =>
      format(addDays(weekStart, i), 'EEE', { locale })
    )
  }, [locale])

  const visibleCalendarIds = useMemo(
    () => new Set(calendars.filter(c => c.isVisible).map(c => c.id)),
    [calendars]
  )

  const instancesByDay = useMemo(() => {
    const map = new Map<string, EventInstance[]>()
    for (const inst of instances) {
      if (!visibleCalendarIds.has(inst.event.calendarId)) continue
      const key = dayKeyInTz(inst.instanceStart, timezone)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(inst)
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => {
        if (a.event.allDay !== b.event.allDay) return a.event.allDay ? -1 : 1
        return a.instanceStart.localeCompare(b.instanceStart)
      })
    }
    return map
  }, [instances, visibleCalendarIds, timezone])

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

  const handleDragStart = (event: DragStartEvent) => {
    const inst = event.active.data.current?.inst as EventInstance | undefined
    if (!inst) return
    setActiveInst(inst)
    setDraggingKey(`${inst.event.id}-${inst.instanceStart}`)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveInst(null)

    const inst = active.data.current?.inst as EventInstance | undefined
    const targetDate = over?.data.current?.date as string | undefined

    if (!inst || !targetDate) {
      setDraggingKey(null)
      return
    }

    const sourceDate = dayKeyInTz(inst.instanceStart, timezone)
    if (sourceDate === targetDate) {
      setDraggingKey(null)
      return
    }

    const delta = differenceInDays(parseISO(targetDate), parseISO(sourceDate))
    const newStart = addDays(parseISO(inst.instanceStart), delta)
    const newEnd = addDays(parseISO(inst.instanceEnd), delta)

    const scope: RecurringEditScope = inst.isRecurring ? 'this' : 'all'
    await update(
      inst.event.id,
      { start: newStart.toISOString(), end: newEnd.toISOString() },
      scope,
      inst.isRecurring ? inst.instanceStart : undefined,
    )
    // chip is now at new date (optimistic update changed instanceStart),
    // so draggingKey no longer matches anything — safe to clear
    setDraggingKey(null)
    await loadRange(parseISO(selectedDate), view)
  }

  const activeDragHex = activeInst
    ? getEventHex(activeInst.event.color ?? calendars.find(c => c.id === activeInst.event.calendarId)?.color)
    : '#3b82f6'

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full select-none p-4">
        <div
          className="flex flex-col flex-1 overflow-hidden"
          style={{ border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--surface)' }}
        >
        {/* weekday headers */}
        <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
          {showWeekNumbers && (
            <div className="w-7 shrink-0" />
          )}
          <div className={`grid flex-1 border-[var(--border)]`} style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {weekdayLabels.map((d, i) => (
              <div key={i} className="py-2 text-right pr-3 text-[11px] font-[650] text-[var(--text-tertiary)] uppercase tracking-[0.04em]">
                {d}
              </div>
            ))}
          </div>
        </div>

        {/* calendar grid */}
        <div className="flex flex-1">
          {/* week number column */}
          {showWeekNumbers && (
            <div className="w-7 shrink-0 flex flex-col" style={{ gridTemplateRows: `repeat(${grid.length / 7}, 1fr)` }}>
              {Array.from({ length: grid.length / 7 }, (_, i) => {
                const weekDay = grid[i * 7]
                return (
                  <div
                    key={i}
                    className="flex-1 flex items-start justify-center pt-2 border-b border-[var(--border)]"
                  >
                    <span className="text-[10px] font-medium text-[var(--text-tertiary)] leading-none">
                      {getISOWeek(weekDay)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* days grid */}
          <div className="flex-1 grid grid-cols-7" style={{ gridTemplateRows: `repeat(${grid.length / 7}, 1fr)` }}>
          {grid.map(day => {
            const key = format(day, 'yyyy-MM-dd')
            return (
              <DroppableCell
                key={key}
                dayKey={key}
                inMonth={isSameMonth(day, currentDate)}
                today={isToday(day)}

                day={day}
                dayInstances={instancesByDay.get(key) ?? []}
                maxVisible={3}
                expandedCell={expandedCell}
                draggingKey={draggingKey}
                dayTasks={tasksByDay.get(key) ?? []}
                onTaskToggle={id => toggleTask(id)}
                onCellClick={() => {
                  setSelectedDate(key)
                  openNewEvent({ start: startOfDay(day).toISOString(), allDay: true })
                }}
                onExpandClick={k => setExpandedCell(k || null)}
                onEventClick={(inst, el) => {
                  setSelectedDate(key)
                  openPopover(inst.event.id, inst.instanceStart, el)
                }}
              />
            )
          })}
          </div>
        </div>
        </div> {/* end bordered container */}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeInst && (
          <div
            className="chip-bar shadow-lg pointer-events-none max-w-[160px]"
            style={{ '--c': activeDragHex, opacity: 0.9 } as React.CSSProperties}
          >
            <span className="chip-bar-rail" style={{ background: activeDragHex }} />
            <span className="chip-bar-label">{activeInst.event.title}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
