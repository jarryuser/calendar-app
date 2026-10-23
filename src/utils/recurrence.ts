import i18n from '@/i18n'
import { RRule, Weekday } from 'rrule'
import { addMilliseconds, differenceInMilliseconds, parseISO, endOfDay, format, differenceInCalendarDays, addDays } from 'date-fns'
import type { CalendarEvent, EventInstance, RecurrenceRule } from '@/types/event'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { dayKeyInTz } from './timezone'
import { sourceEvent, icalDate } from './ical'
import { db } from '@/db'

const WEEKDAY_MAP: Record<string, Weekday> = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
}

const FREQ_MAP = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly: RRule.YEARLY,
}

export function buildRRule(event: CalendarEvent, rule: RecurrenceRule): RRule {
  const timezone = event.allDay ? undefined : event.timezone
  const wallTime = (value: string) => event.allDay
    ? new Date(`${format(parseISO(value), "yyyy-MM-dd'T'HH:mm:ss")}Z`)
    : timezone ? new Date(`${formatInTimeZone(parseISO(value), timezone, "yyyy-MM-dd'T'HH:mm:ss")}Z`) : parseISO(value)
  const dtstart = wallTime(event.start)

  return new RRule({
    freq: FREQ_MAP[rule.frequency],
    interval: rule.interval,
    dtstart,
    byweekday: rule.byWeekDay?.map(d => WEEKDAY_MAP[d]),
    bymonthday: rule.byMonthDay,
    count: rule.count,
    until: rule.until ? (rule.until.length === 10 ? (timezone || event.allDay ? new Date(`${rule.until}T23:59:59Z`) : endOfDay(parseISO(rule.until))) : wallTime(rule.until)) : undefined,
  })
}

export async function expandRecurringEvents(
  masterEvents: CalendarEvent[],
  windowStart: Date,
  windowEnd: Date,
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): Promise<EventInstance[]> {
  const instances: EventInstance[] = []

  for (const event of masterEvents) {
    if (!event.recurrence) continue
    const rangeStart = event.allDay ? parseISO(dayKeyInTz(windowStart.toISOString(), timezone)) : windowStart
    const rangeEnd = event.allDay ? endOfDay(parseISO(dayKeyInTz(windowEnd.toISOString(), timezone))) : windowEnd

    const rule = buildRRule(event, event.recurrence)
    const durationDays = event.allDay ? differenceInCalendarDays(parseISO(event.end), parseISO(event.start)) : 0
    const duration = differenceInMilliseconds(parseISO(event.end), parseISO(event.start))

    let dates: Date[]
    if (event.recurrence.raw && event.ical) {
      const source = sourceEvent(event)
      const iterator = source.iterator()
      dates = []
      let steps = 0
      let occurrence
      while ((occurrence = iterator.next())) {
        if (++steps > 200_000) throw new Error('Recurrence is too large to display; narrow the series')
        const date = parseISO(icalDate(occurrence))
        if (event.recurrence.until && date > (event.recurrence.until.length === 10 ? endOfDay(parseISO(event.recurrence.until)) : parseISO(event.recurrence.until))) break
        if (event.recurrence.count && steps > event.recurrence.count) break
        if (date > rangeEnd) break
        if (date.getTime() + duration > rangeStart.getTime()) dates.push(date)
      }
    } else {
      const wall = (date: Date) => event.allDay
        ? new Date(`${format(date, "yyyy-MM-dd'T'HH:mm:ss")}Z`)
        : event.timezone ? new Date(`${formatInTimeZone(date, event.timezone, "yyyy-MM-dd'T'HH:mm:ss")}Z`) : date
      dates = rule.between(wall(new Date(rangeStart.getTime() - Math.max(0, duration))), wall(rangeEnd), true).map(date =>
        event.allDay ? parseISO(date.toISOString().slice(0, 10)) : event.timezone ? fromZonedTime(date.toISOString().slice(0, 19), event.timezone) : date
      )
    }

    const [exceptions, deletions] = await Promise.all([
      db.events
        .where('recurringEventId')
        .equals(event.id)
        .filter(e => e.isException === true)
        .toArray(),
      db.deletedInstances
        .where('eventId')
        .equals(event.id)
        .toArray(),
    ])

    const dateKey = (value: string) => event.allDay ? format(parseISO(value), 'yyyy-MM-dd') : parseISO(value).toISOString()
    const exceptionMap = new Map(exceptions.map(e => [dateKey(e.exceptionDate!), e]))
    const deletedSet = new Set(deletions.map(d => dateKey(d.date)))
    const overlaps = (start: string, end: string) => parseISO(start) <= rangeEnd && parseISO(end) > rangeStart

    for (const exception of exceptions) {
      if (!deletedSet.has(dateKey(exception.exceptionDate!)) && overlaps(exception.start, exception.end)) {
        instances.push({ event: exception, instanceStart: exception.start, instanceEnd: exception.end, isRecurring: true })
      }
    }

    for (const date of dates) {
      const instanceStart = event.allDay ? format(date, 'yyyy-MM-dd') : date.toISOString()
      if (deletedSet.has(dateKey(instanceStart)) || exceptionMap.has(dateKey(instanceStart))) continue
      const endDate = event.allDay ? addDays(date, durationDays) : addMilliseconds(date, duration)
      const instanceEnd = event.allDay ? format(endDate, 'yyyy-MM-dd') : endDate.toISOString()
      if (overlaps(instanceStart, instanceEnd)) {
        instances.push({ event, instanceStart, instanceEnd, isRecurring: true })
      }
    }
  }

  return instances
}

export function recurrenceRuleToText(rule: RecurrenceRule): string {
  if (rule.raw) return rule.raw
  const unit = i18n.t(`recurrence.${{ daily: 'unitDays', weekly: 'unitWeeks', monthly: 'unitMonths', yearly: 'unitYears' }[rule.frequency]}`)
  let text = rule.interval === 1 ? i18n.t(`recurrence.${rule.frequency}`) : i18n.t('recurrence.summary', { interval: rule.interval, unit })
  if (rule.byWeekDay?.length) text += `, ${i18n.t('recurrence.onDays', { days: rule.byWeekDay.join(', ') })}`
  if (rule.count) text += `, ${i18n.t('recurrence.countText', { count: rule.count })}`
  else if (rule.until) text += `, ${i18n.t('recurrence.untilText', { date: rule.until.slice(0, 10) })}`
  return text
}
