import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { parseISO, format, isSameDay } from 'date-fns'
import { X, Edit2, Trash2, MapPin, RefreshCw, Calendar, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUIStore, type PopoverAnchor } from '@/store/uiStore'
import { useEventStore } from '@/store/eventStore'
import { useCalendarStore } from '@/store/calendarStore'
import { getEventHex } from '@/utils/colors'
import { recurrenceRuleToText } from '@/utils/recurrence'
import { useDateLocale } from '@/i18n/useDateLocale'
import type { RecurringEditScope } from '@/types/event'

const POPOVER_W = 288
const POPOVER_H = 260 // estimated max height
const MARGIN = 10

function calcPosition(anchor: PopoverAnchor): { top: number; left: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight

  // prefer right side, fall back to left
  let left = anchor.right + MARGIN
  if (left + POPOVER_W > vw - MARGIN) {
    left = anchor.left - POPOVER_W - MARGIN
  }
  left = Math.max(MARGIN, Math.min(left, vw - POPOVER_W - MARGIN))

  // align top with anchor, shift up if overflows bottom
  let top = anchor.top
  if (top + POPOVER_H > vh - MARGIN) {
    top = vh - POPOVER_H - MARGIN
  }
  top = Math.max(MARGIN, top)

  return { top, left }
}

function DeleteButton({
  isRecurring,
  onDelete,
}: {
  isRecurring: boolean
  onDelete: (scope: RecurringEditScope) => void
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  if (!isRecurring) {
    return (
      <button
        onClick={() => onDelete('all')}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
      >
        <Trash2 size={14} />
        {t('eventModal.delete')}
      </button>
    )
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
      >
        <Trash2 size={14} />
        {t('eventModal.delete')}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {(['this', 'thisAndFollowing', 'all'] as RecurringEditScope[]).map(scope => (
        <button
          key={scope}
          onClick={() => onDelete(scope)}
          className="text-left px-2.5 py-1 rounded-lg text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          {scope === 'this' && 'This event'}
          {scope === 'thisAndFollowing' && 'This & following'}
          {scope === 'all' && 'All events'}
        </button>
      ))}
    </div>
  )
}

export function EventPopover() {
  const { t } = useTranslation()
  const locale = useDateLocale()
  const { popover, closePopover, openEditEvent } = useUIStore()
  const { events, remove, loadRange } = useEventStore()
  const { calendars } = useCalendarStore()
  const { view, selectedDate } = useUIStore()
  const ref = useRef<HTMLDivElement>(null)

  const event = popover ? events.find(e => e.id === popover.eventId) : null
  const calendar = event ? calendars.find(c => c.id === event.calendarId) : null
  const hex = getEventHex(event?.color ?? calendar?.color)

  useEffect(() => {
    if (!popover) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closePopover()
      }
    }
    // slight delay so the opening click doesn't immediately close it
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 50)
    return () => { clearTimeout(id); document.removeEventListener('mousedown', handler) }
  }, [popover, closePopover])

  useEffect(() => {
    if (!popover) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closePopover() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [popover, closePopover])

  if (!popover || !event) return null

  const { top, left } = calcPosition(popover.anchor)
  const instanceStart = parseISO(popover.instanceStart)
  const instanceEnd = parseISO(
    // compute end based on event duration
    new Date(instanceStart.getTime() + (parseISO(event.end).getTime() - parseISO(event.start).getTime())).toISOString()
  )

  const dateLabel = event.allDay
    ? format(instanceStart, 'PPP', { locale })
    : isSameDay(instanceStart, instanceEnd)
      ? `${format(instanceStart, 'PPP', { locale })} · ${format(instanceStart, 'h:mma')} – ${format(instanceEnd, 'h:mma')}`
      : `${format(instanceStart, 'PP', { locale })} ${format(instanceStart, 'h:mma')} – ${format(instanceEnd, 'PP', { locale })} ${format(instanceEnd, 'h:mma')}`

  const handleDelete = async (scope: RecurringEditScope) => {
    closePopover()
    await remove(event.id, scope, event.recurrence ? popover.instanceStart : undefined)
    await loadRange(parseISO(selectedDate), view)
  }

  const handleEdit = () => {
    openEditEvent(event.id, popover.instanceStart)
  }

  return createPortal(
    <div
      ref={ref}
      style={{ position: 'fixed', top, left, width: POPOVER_W, zIndex: 9999 }}
      className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
    >
      {/* color bar + title row */}
      <div className="flex items-start gap-2.5 p-4 pb-3">
        <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: hex }} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[var(--text-primary)] leading-snug break-words">
            {event.title}
          </h3>
          {calendar && (
            <span className="text-xs text-[var(--text-tertiary)] mt-0.5 block">{calendar.name}</span>
          )}
        </div>
        <button
          onClick={closePopover}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* details */}
      <div className="px-4 pb-3 space-y-2">
        <div className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
          <Clock size={14} className="shrink-0 mt-0.5" />
          <span className="leading-snug">{dateLabel}</span>
        </div>

        {event.location && (
          <div className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
            <MapPin size={14} className="shrink-0 mt-0.5" />
            <span className="leading-snug truncate">{event.location}</span>
          </div>
        )}

        {event.recurrence && (
          <div className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
            <RefreshCw size={14} className="shrink-0" />
            <span className="truncate">{recurrenceRuleToText(event.recurrence)}</span>
          </div>
        )}

        {event.description && (
          <div className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
            <Calendar size={14} className="shrink-0 mt-0.5 opacity-0" />
            <p className="leading-snug line-clamp-3 text-[var(--text-tertiary)]">{event.description}</p>
          </div>
        )}
      </div>

      {/* actions */}
      <div className="flex items-center justify-between px-2 py-2 border-t border-[var(--border)]">
        <DeleteButton isRecurring={!!event.recurrence} onDelete={handleDelete} />
        <button
          onClick={handleEdit}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Edit2 size={14} />
          {t('calendarList.edit')}
        </button>
      </div>
    </div>,
    document.body
  )
}
