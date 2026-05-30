import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { parseISO, format, isToday, isSameDay, differenceInMinutes, startOfDay, addMinutes, getISOWeek } from 'date-fns'
import { useTranslation } from 'react-i18next'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, pointerWithin,
  type DragStartEvent, type DragMoveEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { useUIStore } from '@/store/uiStore'
import { useEventStore } from '@/store/eventStore'
import { showToast } from '@/components/ui/Toast'
import { useCalendarStore } from '@/store/calendarStore'
import { getWeekDays } from '@/utils/dates'
import { getEventHex } from '@/utils/colors'
import { useDateLocale } from '@/i18n/useDateLocale'
import { toLocalTime, getTzAbbrev } from '@/utils/timezone'
import type { CalendarEvent, EventInstance, RecurringEditScope } from '@/types/event'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_HEIGHT = 64
const PX_PER_MIN = HOUR_HEIGHT / 60
const SNAP_MIN = 15

const snapMin = (min: number) => Math.round(min / SNAP_MIN) * SNAP_MIN
const pxToMin = (px: number) => px / PX_PER_MIN
const minToPx = (min: number) => min * PX_PER_MIN
const clampStart = (start: number, dur: number) => Math.max(0, Math.min(24 * 60 - dur, start))

interface DragState {
  id: string
  type: 'move' | 'resize'
  instanceStart: string
  originalDayKey: string
  originalStartMin: number
  durationMin: number
  heightPx: number
  title: string
  hex: string
}

interface Preview {
  dayKey: string
  startMin: number
  durationMin: number
}

function eventStartMin(instanceStart: string, timezone: string): number {
  const d = toLocalTime(instanceStart, timezone)
  return differenceInMinutes(d, startOfDay(d))
}

function eventDurationMin(start: string, end: string): number {
  return Math.max(15, differenceInMinutes(parseISO(end), parseISO(start)))
}

function CurrentTimeLine({ timezone }: { timezone: string }) {
  const [top, setTop] = useState(0)
  useEffect(() => {
    const update = () => {
      const now = toLocalTime(new Date().toISOString(), timezone)
      setTop(minToPx(differenceInMinutes(now, startOfDay(now))))
    }
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [timezone])
  return (
    <div className="absolute left-0 right-0 pointer-events-none z-10" style={{ top }}>
      <div className="relative">
        <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
        <div className="h-px bg-red-500 w-full" />
      </div>
    </div>
  )
}

function layoutEvents(instances: EventInstance[]) {
  const sorted = [...instances].sort((a, b) => a.instanceStart.localeCompare(b.instanceStart))
  const result: Array<{ inst: EventInstance; col: number; cols: number }> = []
  const groups: EventInstance[][] = []
  for (const inst of sorted) {
    const s = parseISO(inst.instanceStart).getTime()
    const e = parseISO(inst.instanceEnd).getTime()
    let placed = false
    for (const group of groups) {
      if (group.some(g => s < parseISO(g.instanceEnd).getTime() && e > parseISO(g.instanceStart).getTime())) {
        group.push(inst)
        placed = true
        break
      }
    }
    if (!placed) groups.push([inst])
  }
  for (const group of groups) {
    group.forEach((inst, col) => result.push({ inst, col, cols: group.length }))
  }
  return result
}

function DraggableEventBlock({
  inst, col, cols, dayKey, isDragSource, onEventClick, timezone,
}: {
  inst: EventInstance
  col: number
  cols: number
  dayKey: string
  isDragSource: boolean
  onEventClick: (id: string, instanceStart: string, el: Element) => void
  timezone: string
}) {
  const { calendars } = useCalendarStore()
  const color = inst.event.color ?? calendars.find(c => c.id === inst.event.calendarId)?.color
  const hex = getEventHex(color)
  const startMin = eventStartMin(inst.instanceStart, timezone)
  const durMin = eventDurationMin(inst.instanceStart, inst.instanceEnd)
  const top = minToPx(startMin)
  const height = minToPx(durMin)
  const w = `calc((100% - 2px) / ${cols})`
  const l = `calc((100% - 2px) / ${cols} * ${col})`

  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `move-${inst.event.id}-${inst.instanceStart}`,
    data: { type: 'move', inst, dayKey },
  })

  const {
    attributes: ra,
    listeners: rl,
    setNodeRef: setResizeRef,
  } = useDraggable({
    id: `resize-${inst.event.id}-${inst.instanceStart}`,
    data: { type: 'resize', inst, dayKey },
  })

  return (
    <div
      ref={setNodeRef}
      className="tevent cursor-grab active:cursor-grabbing select-none"
      style={{
        '--c': hex,
        top: top + 1,
        height: Math.max(height - 2, 20),
        left: l,
        width: w,
        opacity: isDragSource ? 0 : 1,
        touchAction: 'none',
        zIndex: isDragSource ? 0 : 1,
        transition: 'opacity 0.12s ease',
      } as React.CSSProperties}
      {...listeners}
      {...attributes}
      onClick={e => { e.stopPropagation(); onEventClick(inst.event.id, inst.instanceStart, e.currentTarget) }}
    >
      <div className="tevent-title">{inst.event.title}</div>
      {height > 30 && (
        <div className="tevent-time">
          {format(toLocalTime(inst.instanceStart, timezone), 'h:mma')}
        </div>
      )}

      {/* resize handle */}
      <div
        ref={setResizeRef}
        style={{ touchAction: 'none' }}
        className="absolute bottom-0 left-0 right-0 h-2.5 cursor-s-resize flex items-end justify-center pb-0.5"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        {...rl}
        {...ra}
      >
        <div className="w-6 h-0.5 rounded-full opacity-50" style={{ backgroundColor: hex }} />
      </div>
    </div>
  )
}

function DroppableColumn({
  dayKey,
  children,
}: {
  dayKey: string
  children: React.ReactNode
}) {
  const { setNodeRef } = useDroppable({ id: `col-${dayKey}`, data: { dayKey } })
  return (
    <div ref={setNodeRef} className="absolute inset-0">
      {children}
    </div>
  )
}

export function WeekView() {
  const { t } = useTranslation()
  const locale = useDateLocale()
  const { selectedDate, setSelectedDate, openNewEvent, openPopover, showWeekNumbers, timezone } = useUIStore()
  const { instances, update, loadRange, saveDragUndo, undoLastDrag, clearDragUndo } = useEventStore()
  const { calendars } = useCalendarStore()
  const { view } = useUIStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  const weekDays = useMemo(() => getWeekDays(parseISO(selectedDate)), [selectedDate])
  const visibleIds = useMemo(() => new Set(calendars.filter(c => c.isVisible).map(c => c.id)), [calendars])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const [drag, setDrag] = useState<DragState | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)

  const instancesByDay = useMemo(() => {
    const map = new Map<string, EventInstance[]>()
    for (const d of weekDays) map.set(format(d, 'yyyy-MM-dd'), [])
    for (const inst of instances) {
      if (!visibleIds.has(inst.event.calendarId) || inst.event.allDay) continue
      const key = format(parseISO(inst.instanceStart), 'yyyy-MM-dd')
      map.get(key)?.push(inst)
    }
    return map
  }, [instances, visibleIds, weekDays])

  const allDayByDay = useMemo(() => {
    const map = new Map<string, EventInstance[]>()
    for (const inst of instances) {
      if (!visibleIds.has(inst.event.calendarId) || !inst.event.allDay) continue
      const key = format(parseISO(inst.instanceStart), 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(inst)
    }
    return map
  }, [instances, visibleIds])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT
  }, [])

  const computePreview = useCallback((
    info: DragState,
    deltaY: number,
    overDayKey: string | null,
  ): Preview => {
    if (info.type === 'resize') {
      const newDur = Math.max(SNAP_MIN, snapMin(info.durationMin + Math.round(pxToMin(deltaY))))
      return { dayKey: info.originalDayKey, startMin: info.originalStartMin, durationMin: newDur }
    }
    const rawStart = info.originalStartMin + Math.round(pxToMin(deltaY))
    const snapped = snapMin(clampStart(rawStart, info.durationMin))
    return {
      dayKey: overDayKey ?? info.originalDayKey,
      startMin: snapped,
      durationMin: info.durationMin,
    }
  }, [])

  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as { type: 'move' | 'resize'; inst: EventInstance; dayKey: string }
    const { inst, type, dayKey } = data
    const cal = calendars.find(c => c.id === inst.event.calendarId)
    const hex = getEventHex(inst.event.color ?? cal?.color)
    setDrag({
      id: String(e.active.id),
      type,
      instanceStart: inst.instanceStart,
      originalDayKey: dayKey,
      originalStartMin: eventStartMin(inst.instanceStart, timezone),
      durationMin: eventDurationMin(inst.instanceStart, inst.instanceEnd),
      heightPx: minToPx(eventDurationMin(inst.instanceStart, inst.instanceEnd)),
      title: inst.event.title,
      hex,
    })
    setPreview(null)
  }

  const handleDragMove = (e: DragMoveEvent) => {
    if (!drag) return
    const overDayKey = e.over?.data.current?.dayKey as string | null ?? null
    setPreview(computePreview(drag, e.delta.y, overDayKey))
  }

  const handleDragEnd = async (e: DragEndEvent) => {
    if (!drag) { setDrag(null); setPreview(null); return }

    // use data.current — dnd-kit keeps it in a ref, always up-to-date
    const inst = e.active.data.current?.inst as EventInstance | undefined
    if (!inst) { setDrag(null); setPreview(null); return }

    const overDayKey = e.over?.data.current?.dayKey as string | null ?? null
    const final = computePreview(drag, e.delta.y, overDayKey)

    const targetDay = parseISO(final.dayKey)
    const newStart = new Date(
      targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate(),
      Math.floor(final.startMin / 60), final.startMin % 60, 0, 0
    )
    const newEnd = addMinutes(newStart, final.durationMin)

    const scope: RecurringEditScope = inst.isRecurring ? 'this' : 'all'

    // save state for undo before updating
    saveDragUndo({
      eventId: inst.event.id,
      previousStart: inst.event.start,
      previousEnd: inst.event.end,
      scope,
      instanceStart: inst.isRecurring ? drag.instanceStart : undefined,
    })

    await update(
      inst.event.id,
      { start: newStart.toISOString(), end: newEnd.toISOString() } as Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>,
      scope,
      inst.isRecurring ? drag.instanceStart : undefined,
    )
    await loadRange(parseISO(selectedDate), view)

    setDrag(null)
    setPreview(null)

    showToast({
      message: 'Event moved',
      actionLabel: 'Undo',
      onAction: async () => { await undoLastDrag(); await loadRange(parseISO(selectedDate), view) },
      duration: 6000,
    })
    setTimeout(clearDragUndo, 6500)
  }

  const hasAllDay = Array.from(allDayByDay.values()).some(v => v.length > 0)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full overflow-hidden p-4">
        <div
          className="flex flex-col flex-1 overflow-hidden"
          style={{ border: '1px solid var(--border)', borderRadius: 'var(--r)', background: 'var(--surface)' }}
        >
        {/* day headers */}
        <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-14 shrink-0 flex flex-col items-end justify-end pb-1 pr-1.5 gap-0.5">
            {showWeekNumbers && (
              <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
                W{getISOWeek(parseISO(selectedDate))}
              </span>
            )}
            <span className="text-[9px] text-[var(--text-tertiary)] leading-none">
              {getTzAbbrev(timezone)}
            </span>
          </div>
          {weekDays.map(day => (
            <div
              key={day.toISOString()}
              className="flex-1 text-center py-2 border-l border-[var(--border)] cursor-pointer hover:bg-[var(--surface-secondary)]"
              onClick={() => setSelectedDate(format(day, 'yyyy-MM-dd'))}
            >
              <span className="text-xs font-medium uppercase text-[var(--text-tertiary)]">
                {format(day, 'EEE', { locale })}
              </span>
              <div
                className="mx-auto mt-0.5 w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium text-[var(--text-primary)]"
                style={
                  isToday(day)
                    ? { background: 'var(--accent)', color: '#fff' }
                    : isSameDay(day, parseISO(selectedDate))
                      ? { background: 'var(--surface-tertiary)' }
                      : undefined
                }
              >
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* all-day row */}
        {hasAllDay && (
          <div className="flex shrink-0 min-h-[36px]" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="w-14 shrink-0 flex items-center justify-end pr-2">
              <span className="text-xs text-[var(--text-tertiary)]">{t('views.allDay')}</span>
            </div>
            {weekDays.map(day => {
              const key = format(day, 'yyyy-MM-dd')
              return (
                <div key={key} className="flex-1 border-l border-[var(--border)] px-0.5 py-0.5 space-y-0.5">
                  {(allDayByDay.get(key) ?? []).map((inst, i) => {
                    const hex = getEventHex(inst.event.color ?? calendars.find(c => c.id === inst.event.calendarId)?.color)
                    return (
                      <div
                        key={i}
                        onClick={e => { e.stopPropagation(); openPopover(inst.event.id, inst.instanceStart, e.currentTarget) }}
                        className="text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 font-medium"
                        style={{ backgroundColor: hex + '22', color: hex, borderLeft: `2px solid ${hex}` }}
                      >
                        {inst.event.title}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

        {/* time grid */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="flex relative" style={{ height: HOUR_HEIGHT * 24 }}>
            {/* time gutter */}
            <div className="w-14 shrink-0 relative pointer-events-none">
              {HOURS.map(h => (
                <div
                  key={h}
                  className="absolute right-2 text-xs text-[var(--text-tertiary)] -translate-y-2"
                  style={{ top: h * HOUR_HEIGHT }}
                >
                  {h === 0 ? '' : format(new Date(2000, 0, 1, h), 'ha')}
                </div>
              ))}
            </div>

            {/* day columns */}
            {weekDays.map(day => {
              const dayKey = format(day, 'yyyy-MM-dd')
              const dayInstances = instancesByDay.get(dayKey) ?? []
              const laid = layoutEvents(dayInstances)

              return (
                <div
                  key={dayKey}
                  className="flex-1 relative"
                  style={{
                    borderLeft: '1px solid var(--grid-soft)',
                    background: isToday(day) ? 'color-mix(in srgb, var(--accent) 4%, transparent)' : 'transparent',
                  }}
                >
                  {/* hour lines + click slots */}
                  {HOURS.map(h => (
                    <div
                      key={h}
                      onClick={() => {
                        const start = new Date(day)
                        start.setHours(h, 0, 0, 0)
                        const end = new Date(start)
                        end.setHours(h + 1, 0, 0, 0)
                        setSelectedDate(format(day, 'yyyy-MM-dd'))
                        openNewEvent({ start: start.toISOString(), end: end.toISOString() })
                      }}
                      className="absolute left-0 right-0 cursor-pointer"
                      style={{ borderTop: '1px solid var(--grid-soft)', top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    />
                  ))}

                  {isToday(day) && <CurrentTimeLine timezone={timezone} />}

                  {/* drag-and-drop layer */}
                  <DroppableColumn dayKey={dayKey}>
                    {/* preview indicator */}
                    {drag && preview && preview.dayKey === dayKey && (
                      <div
                        className="absolute rounded pointer-events-none z-20"
                        style={{
                          top: minToPx(preview.startMin) + 1,
                          height: Math.max(minToPx(preview.durationMin) - 2, 18),
                          left: 2,
                          right: 2,
                          backgroundColor: drag.hex + '22',
                          border: `2px dashed ${drag.hex}`,
                          transition: 'top 0.08s ease, height 0.08s ease',
                        }}
                      >
                        <div className="text-xs font-medium px-1 pt-0.5 truncate" style={{ color: drag.hex }}>
                          {format(new Date(2000, 0, 1, Math.floor(preview.startMin / 60), preview.startMin % 60), 'h:mma')}
                        </div>
                      </div>
                    )}

                    {/* event blocks */}
                    {laid.map(({ inst, col, cols }) => {
                      const isDragSource = drag !== null && drag.instanceStart === inst.instanceStart
                      return (
                        <DraggableEventBlock
                          key={`${inst.event.id}-${inst.instanceStart}`}
                          inst={inst}
                          col={col}
                          cols={cols}
                          dayKey={dayKey}
                          isDragSource={isDragSource}
                          onEventClick={(id, instanceStart, el) => openPopover(id, instanceStart, el)}
                          timezone={timezone}
                        />
                      )
                    })}
                  </DroppableColumn>
                </div>
              )
            })}
          </div>
        </div>
        </div> {/* end bordered container */}
      </div>

      <DragOverlay dropAnimation={null}>
        {drag && drag.type === 'move' && (
          <div
            className="tevent shadow-xl pointer-events-none"
            style={{
              '--c': drag.hex,
              height: Math.max(drag.heightPx, 20),
              minWidth: 120,
              opacity: 0.9,
              position: 'relative',
            } as React.CSSProperties}
          >
            <div className="tevent-title">{drag.title}</div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
