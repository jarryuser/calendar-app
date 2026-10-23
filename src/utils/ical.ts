import ICAL from 'ical.js'
import { parseISO, endOfDay } from 'date-fns'
import type { CalendarEvent, RecurrenceRule, WeekDay, RecurrenceFrequency } from '@/types/event'
import type { DeletedInstance } from '@/db'

const frequencies: Record<string, RecurrenceFrequency> = { DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', YEARLY: 'yearly' }
export type ImportedEvent = Omit<CalendarEvent, 'id' | 'calendarId' | 'createdAt' | 'updatedAt'>
const dateOnly = (time: ICAL.Time) => `${String(time.year).padStart(4, '0')}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`
export const icalDate = (time: ICAL.Time) => time.isDate ? dateOnly(time) : time.toJSDate().toISOString()

export function registerTimezones(timezones: unknown[][]) {
  for (const data of timezones) {
    const component = new ICAL.Component(structuredClone(data))
    const tzid = component.getFirstProperty('tzid')?.getFirstValue() as string
    if (tzid) ICAL.TimezoneService.register(tzid, new ICAL.Timezone({ component, tzid }))
  }
}

export function sourceEvent(event: CalendarEvent) {
  if (!event.ical) throw new Error('Missing calendar source')
  registerTimezones(event.ical.timezones)
  const component = new ICAL.Component(structuredClone(event.ical.component))
  if (event.start !== event.ical.start) { component.getFirstProperty('dtstart')?.removeParameter('tzid'); component.updatePropertyWithValue('dtstart', asTime(event.start, event.allDay)) }
  if (event.end !== event.ical.end) { component.getFirstProperty('dtend')?.removeParameter('tzid'); component.updatePropertyWithValue('dtend', asTime(event.end, event.allDay)) }
  return new ICAL.Event(component)
}

export function importICS(text: string): ImportedEvent[] {
  const root = new ICAL.Component(ICAL.parse(text))
  const timezones = root.getAllSubcomponents('vtimezone').map(component => component.toJSON())
  registerTimezones(timezones)
  const components = root.getAllSubcomponents('vevent')
  const masters = new Set(components.filter(component => !component.getFirstProperty('recurrence-id')).map(component => component.getFirstProperty('uid')?.getFirstValue()))
  return components.map(component => {
    const event = new ICAL.Event(component)
    if (!component.getFirstProperty('dtstart')) throw new Error('ICS event has no DTSTART')
    const tzid = component.getFirstProperty('dtstart')?.getParameter('tzid')
    if (tzid && !timezones.some(zone => new ICAL.Component(zone).getFirstProperty('tzid')?.getFirstValue() === tzid)) {
      throw new Error(`ICS timezone ${tzid} requires VTIMEZONE`)
    }
    const rawRule = component.getFirstProperty('rrule')?.getFirstValue() as ICAL.Recur | undefined
    let recurrence: RecurrenceRule | undefined
    if (rawRule || component.getFirstProperty('rdate')) {
      recurrence = {
        frequency: frequencies[rawRule?.freq || ''] || 'daily', interval: rawRule?.interval || 1,
        byWeekDay: rawRule?.parts.BYDAY?.filter(day => /^[A-Z]{2}$/.test(day)).map(day => day as WeekDay),
        byMonthDay: rawRule?.parts.BYMONTHDAY, count: rawRule?.count || undefined,
        until: rawRule?.until ? icalDate(rawRule.until) : undefined, raw: rawRule?.toString() || 'RDATE',
      }
    }
    const exception = component.getFirstProperty('recurrence-id')?.getFirstValue() as ICAL.Time | undefined
    if (exception && !masters.has(event.uid)) throw new Error('ICS exception has no master event')
    if (component.getFirstProperty('recurrence-id')?.getParameter('range')) throw new Error('ICS RANGE exceptions are not supported; import separate series')
    const start = icalDate(event.startDate)
    const end = icalDate(event.endDate)
    if (Date.parse(end) <= Date.parse(start)) throw new Error('ICS event must end after it starts')
    return {
      uid: event.uid || undefined, title: event.summary || '', start, end, allDay: event.startDate.isDate,
      description: event.description || undefined, location: event.location || undefined, reminders: [], recurrence,
      timezone: tzid || undefined, exceptionDate: exception ? icalDate(exception) : undefined,
      isException: exception ? true : undefined,
      ical: { component: component.toJSON(), timezones, start, end, recurrence: recurrence?.raw },
    }
  })
}

function asTime(value: string, allDay: boolean) {
  if (allDay) return ICAL.Time.fromString(value.slice(0, 10))
  return ICAL.Time.fromJSDate(parseISO(value), true)
}

export function exportICS(events: CalendarEvent[], name = 'Calendar', deletions: DeletedInstance[] = []) {
  const root = new ICAL.Component(['vcalendar', [], []])
  root.updatePropertyWithValue('prodid', '-//Open Calendar//EN')
  root.updatePropertyWithValue('version', '2.0')
  root.updatePropertyWithValue('calscale', 'GREGORIAN')
  root.updatePropertyWithValue('x-wr-calname', name)
  const zones = new Set<string>()
  const byId = new Map(events.map(event => [event.id, event]))
  for (const event of events) {
    for (const zone of event.ical?.timezones || []) {
      const json = JSON.stringify(zone)
      if (!zones.has(json)) { root.addSubcomponent(new ICAL.Component(structuredClone(zone))); zones.add(json) }
    }
    registerTimezones(event.ical?.timezones || [])
    const component = event.ical ? new ICAL.Component(structuredClone(event.ical.component)) : new ICAL.Component('vevent')
    const master = event.recurringEventId ? byId.get(event.recurringEventId) : undefined
    component.updatePropertyWithValue('uid', master?.uid || master?.id || event.uid || event.id)
    component.updatePropertyWithValue('summary', event.title)
    component.updatePropertyWithValue('description', event.description || '')
    component.updatePropertyWithValue('location', event.location || '')
    component.updatePropertyWithValue('dtstamp', ICAL.Time.fromJSDate(new Date(), true))
    if (!event.ical || event.start !== event.ical.start) { component.getFirstProperty('dtstart')?.removeParameter('tzid'); component.updatePropertyWithValue('dtstart', asTime(event.start, event.allDay)) }
    if (!event.ical || event.end !== event.ical.end) { component.getFirstProperty('dtend')?.removeParameter('tzid'); component.updatePropertyWithValue('dtend', asTime(event.end, event.allDay)) }
    if (event.exceptionDate) component.updatePropertyWithValue('recurrence-id', asTime(event.exceptionDate, event.allDay))
    const rule = event.recurrence
    if (!event.ical || !rule || rule.raw !== event.ical.recurrence) {
      component.removeAllProperties('rrule')
      component.removeAllProperties('rdate')
      component.removeAllProperties('exdate')
      if (rule) {
        const recur = new ICAL.Recur({ freq: rule.frequency.toUpperCase() })
        recur.interval = rule.interval
        if (rule.byWeekDay) recur.parts.BYDAY = rule.byWeekDay
        if (rule.byMonthDay) recur.parts.BYMONTHDAY = rule.byMonthDay
        if (rule.count) recur.count = rule.count
        if (rule.until) recur.until = ICAL.Time.fromJSDate(rule.until.length === 10 ? endOfDay(parseISO(rule.until)) : parseISO(rule.until), true)
        component.updatePropertyWithValue('rrule', recur)
      }
    }
    if (rule?.raw && component.getFirstProperty('rrule')) {
      const recur = component.getFirstProperty('rrule')!.getFirstValue() as ICAL.Recur
      if (rule.until) recur.until = asTime(rule.until.length === 10 ? endOfDay(parseISO(rule.until)).toISOString() : rule.until, false)
      if (rule.count) recur.count = rule.count
    }
    const excluded = deletions.filter(deletion => deletion.eventId === event.id)
    if (excluded.length) {
      // Keep imported EXDATE properties and append local exclusions in jCal form.
      const data = component.toJSON() as [string, unknown[][], unknown[]]
      for (const deletion of excluded) data[1].push(['exdate', {}, event.allDay ? 'date' : 'date-time', asTime(deletion.date, event.allDay).toString()])
    }
    root.addSubcomponent(component)
  }
  return root.toString()
}

export function downloadICS(content: string, filename = 'calendar.ics') { downloadFile(content, filename, 'text/calendar;charset=utf-8') }
export function downloadFile(content: string, filename: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url; link.download = filename; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
