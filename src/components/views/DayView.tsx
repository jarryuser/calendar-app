import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { parseISO, format, isToday, differenceInMinutes, startOfDay, addMinutes } from 'date-fns'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, pointerWithin,
  type DragStartEvent, type DragMoveEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { useUIStore } from '@/store/uiStore'
import { useEventStore } from '@/store/eventStore'
import { useCalendarStore } from '@/store/calendarStore'
import { getEventHex } from '@/utils/colors'
import { useDateLocale } from '@/i18n/useDateLocale'
import { toLocalTime, getTzAbbrev } from '@/utils/timezone'
import { showToast } from '@/components/ui/Toast'
import type { CalendarEvent, EventInstance, RecurringEditScope } from '@/types/event'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_HEIGHT = 64
const PX_PER_MIN = HOUR_HEIGHT / 60
const SNAP_MIN = 15

const snapMin = (m: number) => Math.round(m / SNAP_MIN) * SNAP_MIN
const pxToMin = (px: number) => px / PX_PER_MIN
const minToPx = (m: number) => m * PX_PER_MIN
const clampStart = (s: number, d: number) => Math.max(0, Math.min(24 * 60 - d, s))

function eventStartMin(instanceStart: string, timezone: string) {
  const d = toLocalTime(instanceStart, timezone)
  return differenceInMinutes(d, startOfDay(d))
}
function eventDurationMin(start: string, end: string) {
  return Math.max(15, differenceInMinutes(parseISO(end), parseISO(start)))
}

function layoutEvents(instances: EventInstance[]) {
  const sorted = [...instances].sort((a, b) => a.instanceStart.localeCompare(b.instanceStart))
  const result: Array<{ inst: EventInstance; col: number; cols: number }> = []
  const groups: EventInstance[][] = []
  for (const inst of sorted) {
    const s = parseISO(inst.instanceStart).getTime()
    const e = parseISO(inst.instanceEnd).getTime()
    let placed = false
    for (const g of groups) {
      if (g.some(x => s < parseISO(x.instanceEnd).getTime() && e > parseISO(x.instanceStart).getTime())) {
        g.push(inst); placed = true; break
      }
    }
    if (!placed) groups.push([inst])
  }
  for (const g of groups) g.forEach((inst, col) => result.push({ inst, col, cols: g.length }))
  return result
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

function DraggableEventBlock({ inst, col, cols, isDragSource, onEventClick }: {
  inst: EventInstance; col: number; cols: number; isDragSource: boolean
  onEventClick: (id: string, start: string, el: Element) => void
}) {
  const { calendars } = useCalendarStore()
  const hex = getEventHex(inst.event.color ?? calendars.find(c => c.id === inst.event.calendarId)?.color)
  const { timezone } = useUIStore()
  const top = minToPx(eventStartMin(inst.instanceStart, timezone))
  const height = minToPx(eventDurationMin(inst.instanceStart, inst.instanceEnd))

  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `move-${inst.event.id}-${inst.instanceStart}`,
    data: { type: 'move', inst, dayKey: format(parseISO(inst.instanceStart), 'yyyy-MM-dd') },
  })
  const { attributes: ra, listeners: rl, setNodeRef: setResizeRef } = useDraggable({
    id: `resize-${inst.event.id}-${inst.instanceStart}`,
    data: { type: 'resize', inst, dayKey: format(parseISO(inst.instanceStart), 'yyyy-MM-dd') },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        position: 'absolute',
        top: top + 1, height: Math.max(height - 2, 20),
        left: `calc((100% - 2px) / ${cols} * ${col})`,
        width: `calc((100% - 2px) / ${cols})`,
        backgroundColor: hex + '22',
        borderLeft: `3px solid ${hex}`,
        opacity: isDragSource ? 0 : 1,
        touchAction: 'none', zIndex: isDragSource ? 0 : 1,
      }}
      className="rounded px-2 py-1 overflow-hidden cursor-grab active:cursor-grabbing select-none"
      onClick={e => { e.stopPropagation(); onEventClick(inst.event.id, inst.instanceStart, e.currentTarget) }}
    >
      <div className="text-sm font-medium leading-tight truncate" style={{ color: hex }}>{inst.event.title}</div>
      {height > 36 && (
        <div className="text-xs opacity-70 leading-tight" style={{ color: hex }}>
          {format(parseISO(inst.instanceStart), 'h:mma')} - {format(parseISO(inst.instanceEnd), 'h:mma')}
        </div>
      )}
      {height > 56 && inst.event.location && (
        <div className="text-xs opacity-60 leading-tight mt-0.5 truncate" style={{ color: hex }}>{inst.event.location}</div>
      )}
      <div
        ref={setResizeRef}
        {...rl}
        {...ra}
        style={{ touchAction: 'none' }}
        className="absolute bottom-0 left-0 right-0 h-2.5 cursor-s-resize flex items-end justify-center pb-0.5"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-8 h-0.5 rounded-full opacity-50" style={{ backgroundColor: hex }} />
      </div>
    </div>
  )
}

export function DayView() {
  const { selectedDate, openNewEvent, openPopover, timezone } = useUIStore()
  const locale = useDateLocale()
  const { instances, update, loadRange, saveDragUndo, undoLastDrag, clearDragUndo } = useEventStore()
  const { calendars } = useCalendarStore()
  const { view } = useUIStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const [drag, setDrag] = useState<{
    instanceStart: string; type: 'move' | 'resize'
    originalStartMin: number; durationMin: number; hex: string; title: string
  } | null>(null)
  const [preview, setPreview] = useState<{ startMin: number; durationMin: number } | null>(null)

  const day = parseISO(selectedDate)
  const visibleIds = useMemo(() => new Set(calendars.filter(c => c.isVisible).map(c => c.id)), [calendars])

  const { timed, allDay } = useMemo(() => {
    const key = format(day, 'yyyy-MM-dd')
    const timed: EventInstance[] = [], allDay: EventInstance[] = []
    for (const inst of instances) {
      if (!visibleIds.has(inst.event.calendarId)) continue
      if (format(parseISO(inst.instanceStart), 'yyyy-MM-dd') !== key) continue
      if (inst.event.allDay) allDay.push(inst); else timed.push(inst)
    }
    return { timed, allDay }
  }, [instances, visibleIds, selectedDate])

  const laid = layoutEvents(timed)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT
  }, [])

  const { setNodeRef: setDropRef } = useDroppable({ id: 'day-col', data: { dayKey: selectedDate } })

  const computePreview = useCallback((info: typeof drag, deltaY: number) => {
    if (!info) return null
    if (info.type === 'resize') {
      return { startMin: info.originalStartMin, durationMin: Math.max(SNAP_MIN, snapMin(info.durationMin + Math.round(pxToMin(deltaY)))) }
    }
    return { startMin: snapMin(clampStart(info.originalStartMin + Math.round(pxToMin(deltaY)), info.durationMin)), durationMin: info.durationMin }
  }, [])

  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as { type: 'move' | 'resize'; inst: EventInstance }
    const { inst, type } = data
    const hex = getEventHex(inst.event.color ?? calendars.find(c => c.id === inst.event.calendarId)?.color)
    setDrag({ instanceStart: inst.instanceStart, type, originalStartMin: eventStartMin(inst.instanceStart, timezone), durationMin: eventDurationMin(inst.instanceStart, inst.instanceEnd), hex, title: inst.event.title })
  }

  const handleDragMove = (e: DragMoveEvent) => {
    if (!drag) return
    setPreview(computePreview(drag, e.delta.y))
  }

  const handleDragEnd = async (e: DragEndEvent) => {
    if (!drag) { setDrag(null); setPreview(null); return }
    const inst = e.active.data.current?.inst as EventInstance | undefined
    if (!inst) { setDrag(null); setPreview(null); return }
    const final = computePreview(drag, e.delta.y)
    if (final) {
      const newStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(final.startMin / 60), final.startMin % 60, 0, 0)
      const newEnd = addMinutes(newStart, final.durationMin)
      const scope: RecurringEditScope = inst.isRecurring ? 'this' : 'all'
      saveDragUndo({ eventId: inst.event.id, previousStart: inst.event.start, previousEnd: inst.event.end, scope, instanceStart: inst.isRecurring ? drag.instanceStart : undefined })
      await update(inst.event.id, { start: newStart.toISOString(), end: newEnd.toISOString() } as Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>, scope, inst.isRecurring ? drag.instanceStart : undefined)
      await loadRange(parseISO(selectedDate), view)
      showToast({
        message: 'Event moved',
        actionLabel: 'Undo',
        onAction: async () => { await undoLastDrag(); await loadRange(parseISO(selectedDate), view) },
        duration: 6000,
      })
      setTimeout(clearDragUndo, 6500)
    }
    setDrag(null); setPreview(null)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] shrink-0 flex-wrap">
          <div>
            <span className="text-xs font-medium uppercase text-[var(--text-tertiary)]">{format(day, 'EEE')}</span>
            <div className="w-10 h-10 flex items-center justify-center rounded-full text-xl font-bold text-[var(--text-primary)]" style={isToday(day) ? { background: 'var(--accent)', color: '#fff' } : undefined}>
              {format(day, 'd')}
            </div>
            <span className="text-xs text-[var(--text-tertiary)]">{(() => { const s = format(day, 'LLLL yyyy', { locale }); return s.charAt(0).toUpperCase() + s.slice(1) })()}</span>
          </div>
          {allDay.map((inst, i) => {
            const hex = getEventHex(inst.event.color ?? calendars.find(c => c.id === inst.event.calendarId)?.color)
            return (
              <div key={i} onClick={e => openPopover(inst.event.id, inst.instanceStart, e.currentTarget)} className="text-sm px-2 py-1 rounded cursor-pointer hover:opacity-80 font-medium" style={{ backgroundColor: hex + '22', color: hex, borderLeft: `2px solid ${hex}` }}>
                {inst.event.title}
              </div>
            )
          })}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="flex relative" style={{ height: HOUR_HEIGHT * 24 }}>
            <div className="w-14 shrink-0 relative pointer-events-none">
              {HOURS.map(h => (
                <div key={h} className="absolute right-2 text-xs text-[var(--text-tertiary)] -translate-y-2" style={{ top: h * HOUR_HEIGHT }}>
                  {h === 0 ? '' : format(new Date(2000, 0, 1, h), 'ha')}
                </div>
              ))}
            </div>

            <div className="flex-1 relative border-l border-[var(--border)]">
              {HOURS.map(h => (
                <div key={h} onClick={() => {
                  const start = new Date(day); start.setHours(h, 0, 0, 0)
                  const end = new Date(start); end.setHours(h + 1, 0, 0, 0)
                  openNewEvent({ start: start.toISOString(), end: end.toISOString() })
                }} className="absolute left-0 right-0 border-t border-[var(--border)] cursor-pointer hover:bg-[var(--surface-secondary)/50]" style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }} />
              ))}
              {isToday(day) && <CurrentTimeLine timezone={timezone} />}
              <div className="absolute right-1 bottom-1 text-[9px] text-[var(--text-tertiary)]">{getTzAbbrev(timezone)}</div>

              <div ref={setDropRef} className="absolute inset-0">
                {/* preview indicator */}
                {drag && preview && (
                  <div className="absolute rounded pointer-events-none z-20" style={{ top: minToPx(preview.startMin) + 1, height: Math.max(minToPx(preview.durationMin) - 2, 18), left: 4, right: 4, backgroundColor: drag.hex + '22', border: `2px dashed ${drag.hex}`, transition: 'top 0.08s ease, height 0.08s ease' }}>
                    <div className="text-xs font-medium px-1.5 pt-0.5 truncate" style={{ color: drag.hex }}>
                      {format(new Date(2000, 0, 1, Math.floor(preview.startMin / 60), preview.startMin % 60), 'h:mma')}
                    </div>
                  </div>
                )}
                {laid.map(({ inst, col, cols }) => (
                  <DraggableEventBlock key={`${inst.event.id}-${inst.instanceStart}`} inst={inst} col={col} cols={cols} isDragSource={drag?.instanceStart === inst.instanceStart} onEventClick={(id, start, el) => openPopover(id, start, el)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {drag && drag.type === 'move' && (
          <div
            className="rounded px-2 py-1 overflow-hidden shadow-lg pointer-events-none"
            style={{
              height: Math.max(drag.durationMin * (64 / 60), 20),
              minWidth: 160,
              backgroundColor: drag.hex + '33',
              borderLeft: `3px solid ${drag.hex}`,
              opacity: 0.9,
            }}
          >
            <div className="text-sm font-medium leading-tight truncate" style={{ color: drag.hex }}>
              {drag.title}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
