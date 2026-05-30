import { useState, useEffect } from 'react'
import { Calendar, MapPin, AlignLeft, RefreshCw, Bell, Palette, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { ColorPicker } from './ColorPicker'
import { RecurrenceEditor } from './RecurrenceEditor'
import { useUIStore } from '@/store/uiStore'
import { useEventStore } from '@/store/eventStore'
import { useCalendarStore } from '@/store/calendarStore'
import type { CalendarEvent, EventColor, RecurrenceRule, Reminder } from '@/types/event'
import { parseISO, addHours } from 'date-fns'
import { getEventHex } from '@/utils/colors'
import { toDatetimeLocalTz, fromDatetimeLocalTz } from '@/utils/timezone'
import { clsx } from 'clsx'

const REMINDER_VALUES = [0, 5, 10, 15, 30, 60, 120, 1440]

export function EventModal() {
  const { t } = useTranslation()
  const { isEventModalOpen, editingEventId, editingInstanceDate, newEventDefaults, closeEventModal, timezone } = useUIStore()
  const { events, create, update, remove, loadRange } = useEventStore()
  const { calendars, getDefault } = useCalendarStore()
  const { view, selectedDate } = useUIStore()

  const editingEvent = editingEventId ? events.find(e => e.id === editingEventId) : null
  const defaultCalendar = getDefault()

  const defaultStart = newEventDefaults?.start ?? addHours(new Date(), 1).toISOString()
  const defaultEnd = newEventDefaults?.end ?? addHours(new Date(), 2).toISOString()

  const [title, setTitle] = useState('')
  const [start, setStart] = useState(toDatetimeLocalTz(defaultStart, timezone))
  const [end, setEnd] = useState(toDatetimeLocalTz(defaultEnd, timezone))
  const [allDay, setAllDay] = useState(false)
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [color, setColor] = useState<EventColor | undefined>()
  const [calendarId, setCalendarId] = useState(defaultCalendar?.id ?? '')
  const [recurrence, setRecurrence] = useState<RecurrenceRule | undefined>()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showRecurrence, setShowRecurrence] = useState(false)
  const [showReminders, setShowReminders] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEventModalOpen) return

    if (editingEvent) {
      setTitle(editingEvent.title)
      setStart(toDatetimeLocalTz(editingEvent.start, timezone))
      setEnd(toDatetimeLocalTz(editingEvent.end, timezone))
      setAllDay(editingEvent.allDay)
      setDescription(editingEvent.description ?? '')
      setLocation(editingEvent.location ?? '')
      setColor(editingEvent.color)
      setCalendarId(editingEvent.calendarId)
      setRecurrence(editingEvent.recurrence)
      setReminders(editingEvent.reminders ?? [])
      setShowRecurrence(!!editingEvent.recurrence)
    } else {
      const s = newEventDefaults?.start ?? addHours(new Date(), 1).toISOString()
      const e = newEventDefaults?.end ?? addHours(parseISO(s), 1).toISOString()
      setTitle(newEventDefaults?.title ?? '')
      setStart(toDatetimeLocalTz(s, timezone))
      setEnd(toDatetimeLocalTz(e, timezone))
      setAllDay(newEventDefaults?.allDay ?? false)
      setDescription('')
      setLocation('')
      setColor(undefined)
      setCalendarId(newEventDefaults?.calendarId ?? defaultCalendar?.id ?? '')
      setRecurrence(undefined)
      setReminders([])
      setShowRecurrence(false)
    }
    setShowColorPicker(false)
    setShowReminders(false)
  }, [isEventModalOpen, editingEventId])

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    const eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> = {
      title: title.trim(),
      start: allDay ? start.slice(0, 10) : fromDatetimeLocalTz(start, timezone),
      end: allDay ? end.slice(0, 10) : fromDatetimeLocalTz(end, timezone),
      allDay,
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      color,
      calendarId,
      reminders,
      recurrence: showRecurrence ? recurrence : undefined,
    }
    try {
      if (editingEvent) {
        await update(editingEvent.id, eventData, 'all', editingInstanceDate ?? undefined)
      } else {
        await create(eventData)
      }
      await loadRange(parseISO(selectedDate), view)
      closeEventModal()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingEvent) return
    await remove(editingEvent.id, 'all')
    await loadRange(parseISO(selectedDate), view)
    closeEventModal()
  }

  const addReminder = (mins: number) => {
    if (reminders.some(r => r.minutesBefore === mins)) return
    setReminders(prev => [...prev, { id: crypto.randomUUID(), minutesBefore: mins }])
  }

  const removeReminder = (id: string) => setReminders(prev => prev.filter(r => r.id !== id))

  const activeColor = color ?? (calendars.find(c => c.id === calendarId)?.color)

  const availableReminders = REMINDER_VALUES.filter(v => !reminders.some(r => r.minutesBefore === v))

  return (
    <Dialog open={isEventModalOpen} onOpenChange={open => !open && closeEventModal()} className="max-w-lg">
      <div className="p-4 space-y-4">
        <div>
          <input
            autoFocus
            placeholder={t('eventModal.titlePlaceholder')}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="w-full text-lg font-medium bg-transparent border-0 border-b-2 border-[var(--border)] focus:outline-none focus:border-blue-500 pb-1 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors"
          />
        </div>

        <div className="flex items-start gap-2">
          <Calendar size={16} className="mt-2 shrink-0 text-[var(--text-tertiary)]" />
          <div className="flex-1 space-y-2">
            <label className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] cursor-pointer select-none">
              <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} className="rounded" />
              {t('eventModal.allDay')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type={allDay ? 'date' : 'datetime-local'}
                value={allDay ? start.slice(0, 10) : start}
                onChange={e => {
                  setStart(e.target.value)
                  if (e.target.value >= end.slice(0, e.target.value.length)) {
                    setEnd(e.target.value.slice(0, 11) + addHours(parseISO(fromDatetimeLocalTz(e.target.value, timezone)), 1).toISOString().slice(11, 16))
                  }
                }}
                className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[var(--text-tertiary)] text-sm">→</span>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                value={allDay ? end.slice(0, 10) : end}
                min={allDay ? start.slice(0, 10) : start}
                onChange={e => setEnd(e.target.value)}
                className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <MapPin size={16} className="shrink-0 text-[var(--text-tertiary)]" />
          <input
            placeholder={t('eventModal.locationPlaceholder')}
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="flex-1 h-8 bg-transparent border-0 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
          />
        </div>

        <div className="flex items-start gap-2">
          <AlignLeft size={16} className="mt-1 shrink-0 text-[var(--text-tertiary)]" />
          <textarea
            placeholder={t('eventModal.descriptionPlaceholder')}
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="flex-1 bg-transparent border-0 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none resize-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getEventHex(activeColor as EventColor) }} />
          <select
            value={calendarId}
            onChange={e => setCalendarId(e.target.value)}
            className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {calendars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(['color', 'repeat', 'remind'] as const).map(section => {
            const labels = {
              color: t('eventModal.colorButton'),
              repeat: showRecurrence ? t('eventModal.repeatingButton') : t('eventModal.repeatButton'),
              remind: reminders.length > 0
                ? t('eventModal.reminderCount', { count: reminders.length })
                : t('eventModal.remindButton'),
            }
            const active = section === 'color' ? showColorPicker : section === 'repeat' ? showRecurrence : showReminders
            const toggle = () => {
              if (section === 'color') setShowColorPicker(p => !p)
              else if (section === 'repeat') setShowRecurrence(p => !p)
              else setShowReminders(p => !p)
            }
            const Icon = section === 'color' ? Palette : section === 'repeat' ? RefreshCw : Bell
            return (
              <button
                key={section}
                type="button"
                onClick={toggle}
                className={clsx(
                  'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium transition-colors',
                  active
                    ? 'bg-[var(--surface-tertiary)] text-[var(--text-primary)]'
                    : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]'
                )}
              >
                <Icon size={12} />
                {labels[section]}
              </button>
            )
          })}
        </div>

        {showColorPicker && (
          <div className="pl-1">
            <ColorPicker value={color} onChange={c => { setColor(c); setShowColorPicker(false) }} />
            {color && (
              <button type="button" onClick={() => setColor(undefined)} className="text-xs text-[var(--text-tertiary)] mt-1.5 hover:text-[var(--text-secondary)]">
                {t('eventModal.useCalendarColor')}
              </button>
            )}
          </div>
        )}

        {showRecurrence && (
          <div className="bg-[var(--surface-secondary)] rounded-lg p-3">
            <RecurrenceEditor value={recurrence} onChange={setRecurrence} startDate={start} />
            {recurrence && (
              <button type="button" onClick={() => { setRecurrence(undefined); setShowRecurrence(false) }} className="text-xs text-red-500 mt-2 hover:text-red-600">
                {t('eventModal.removeRecurrence')}
              </button>
            )}
          </div>
        )}

        {showReminders && (
          <div className="space-y-2">
            {reminders.map(r => (
              <div key={r.id} className="flex items-center justify-between bg-[var(--surface-secondary)] rounded-lg px-3 py-1.5">
                <span className="text-sm text-[var(--text-primary)]">
                  {t(`eventModal.reminder_${r.minutesBefore}`, { defaultValue: `${r.minutesBefore} min` })}
                </span>
                <button type="button" onClick={() => removeReminder(r.id)} className="text-[var(--text-tertiary)] hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ))}
            <select
              value=""
              onChange={e => { if (e.target.value !== '') addReminder(parseInt(e.target.value)) }}
              className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-sm text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('eventModal.addReminder')}</option>
              {availableReminders.map(v => (
                <option key={v} value={v}>{t(`eventModal.reminder_${v}`, { defaultValue: `${v} min` })}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
          {editingEvent ? (
            <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
              <Trash2 size={14} />
              {t('eventModal.delete')}
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={closeEventModal}>{t('eventModal.cancel')}</Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={!title.trim() || saving}>
              {saving ? t('eventModal.saving') : editingEvent ? t('eventModal.save') : t('eventModal.create')}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
