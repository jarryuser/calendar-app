import ICAL from 'ical.js'
import { parseISO } from 'date-fns'
import type { CalendarEvent, RecurrenceRule, WeekDay, RecurrenceFrequency } from '@/types/event'

const FREQ_FROM_ICAL: Record<string, RecurrenceFrequency> = {
  DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', YEARLY: 'yearly',
}

const FREQ_TO_ICAL: Record<RecurrenceFrequency, string> = {
  daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY',
}

export function importICS(icsString: string): Omit<CalendarEvent, 'id' | 'calendarId' | 'createdAt' | 'updatedAt'>[] {
  const jcal = ICAL.parse(icsString)
  const comp = new ICAL.Component(jcal)
  const vevents = comp.getAllSubcomponents('vevent')

  // ICAL.Time -> "YYYY-MM-DD" using the calendar-date components directly,
  // so all-day events keep their date instead of shifting via UTC conversion.
  const toDateOnly = (t: ICAL.Time): string =>
    `${String(t.year).padStart(4, '0')}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`

  return vevents.map((vevent: ICAL.Component) => {
    const ev = new ICAL.Event(vevent)
    const dtstart = ev.startDate
    const dtend = ev.endDate
    const allDay = dtstart.isDate

    const rruleProp = vevent.getFirstProperty('rrule')
    let recurrence: RecurrenceRule | undefined

    if (rruleProp) {
      const rrule = rruleProp.getFirstValue() as ICAL.Recur
      recurrence = {
        frequency: FREQ_FROM_ICAL[rrule.freq] ?? 'weekly',
        interval: rrule.interval ?? 1,
        byWeekDay: rrule.byday?.map((d: { day: string; num: number }) => d.day as WeekDay),
        byMonthDay: rrule.bymonthday?.length ? rrule.bymonthday : undefined,
        count: rrule.count ?? undefined,
        until: rrule.until ? rrule.until.toJSDate().toISOString() : undefined,
      }
    }

    return {
      uid: ev.uid || undefined,
      title: ev.summary || 'Untitled',
      start: allDay ? toDateOnly(dtstart) : dtstart.toJSDate().toISOString(),
      end: allDay ? toDateOnly(dtend) : dtend.toJSDate().toISOString(),
      allDay,
      description: ev.description || undefined,
      location: ev.location || undefined,
      reminders: [],
      recurrence,
      recurringEventId: undefined,
      exceptionDate: undefined,
      isException: undefined,
    }
  })
}

export function exportICS(events: CalendarEvent[], calendarName = 'Calendar'): string {
  const cal = new ICAL.Component(['vcalendar', [], []])
  cal.updatePropertyWithValue('prodid', '-//Open Calendar//EN')
  cal.updatePropertyWithValue('version', '2.0')
  cal.updatePropertyWithValue('calscale', 'GREGORIAN')
  cal.updatePropertyWithValue('x-wr-calname', calendarName)

  for (const event of events) {
    const vevent = new ICAL.Component('vevent')
    // preserve the original UID so re-importing this export is idempotent
    vevent.updatePropertyWithValue('uid', event.uid || event.id)
    vevent.updatePropertyWithValue('summary', event.title)
    vevent.updatePropertyWithValue('created', ICAL.Time.fromJSDate(parseISO(event.createdAt)))
    vevent.updatePropertyWithValue('dtstamp', ICAL.Time.fromJSDate(new Date()))

    const startTime = ICAL.Time.fromJSDate(parseISO(event.start))
    const endTime = ICAL.Time.fromJSDate(parseISO(event.end))

    if (event.allDay) {
      startTime.isDate = true
      endTime.isDate = true
    }

    vevent.updatePropertyWithValue('dtstart', startTime)
    vevent.updatePropertyWithValue('dtend', endTime)

    if (event.description) vevent.updatePropertyWithValue('description', event.description)
    if (event.location) vevent.updatePropertyWithValue('location', event.location)

    if (event.recurrence) {
      const r = event.recurrence
      const recur = new ICAL.Recur({ freq: FREQ_TO_ICAL[r.frequency] })
      recur.interval = r.interval
      if (r.byWeekDay) recur.byday = r.byWeekDay.map(d => ({ day: d, num: 0 }))
      if (r.byMonthDay) recur.bymonthday = r.byMonthDay
      if (r.count) recur.count = r.count
      if (r.until) recur.until = ICAL.Time.fromJSDate(parseISO(r.until))
      vevent.updatePropertyWithValue('rrule', recur)
    }

    cal.addSubcomponent(vevent)
  }

  return cal.toString()
}

export function downloadICS(content: string, filename = 'calendar.ics') {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
