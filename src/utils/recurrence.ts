import { RRule, Weekday } from 'rrule'
import { addMilliseconds, differenceInMilliseconds, parseISO } from 'date-fns'
import type { CalendarEvent, EventInstance, RecurrenceRule } from '@/types/event'
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

function buildRRule(event: CalendarEvent, rule: RecurrenceRule): RRule {
  const dtstart = parseISO(event.start)

  return new RRule({
    freq: FREQ_MAP[rule.frequency],
    interval: rule.interval,
    dtstart,
    byweekday: rule.byWeekDay?.map(d => WEEKDAY_MAP[d]),
    bymonthday: rule.byMonthDay,
    count: rule.count,
    until: rule.until ? parseISO(rule.until) : undefined,
  })
}

export async function expandRecurringEvents(
  masterEvents: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date,
): Promise<EventInstance[]> {
  const instances: EventInstance[] = []

  for (const event of masterEvents) {
    if (!event.recurrence) continue

    const rule = buildRRule(event, event.recurrence)
    const dates = rule.between(rangeStart, rangeEnd, true)

    const duration = differenceInMilliseconds(parseISO(event.end), parseISO(event.start))

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

    const exceptionMap = new Map(exceptions.map(e => [e.exceptionDate!, e]))
    const deletedSet = new Set(deletions.map(d => d.date))

    for (const date of dates) {
      const instanceStart = date.toISOString()
      if (deletedSet.has(instanceStart)) continue

      const exception = exceptionMap.get(instanceStart)
      if (exception) {
        instances.push({
          event: exception,
          instanceStart: exception.start,
          instanceEnd: exception.end,
          isRecurring: true,
        })
      } else {
        const instanceEnd = addMilliseconds(date, duration).toISOString()
        instances.push({
          event,
          instanceStart,
          instanceEnd,
          isRecurring: true,
        })
      }
    }
  }

  return instances
}

export function recurrenceRuleToText(rule: RecurrenceRule): string {
  const { frequency, interval } = rule
  let text = {
    daily: interval > 1 ? `Every ${interval} days` : 'Daily',
    weekly: interval > 1 ? `Every ${interval} weeks` : 'Weekly',
    monthly: interval > 1 ? `Every ${interval} months` : 'Monthly',
    yearly: interval > 1 ? `Every ${interval} years` : 'Annually',
  }[frequency]

  if (rule.byWeekDay?.length) {
    text += ` on ${rule.byWeekDay.join(', ')}`
  }

  if (rule.count) {
    text += `, ${rule.count} time${rule.count !== 1 ? 's' : ''}`
  } else if (rule.until) {
    text += `, until ${rule.until.slice(0, 10)}`
  }

  return text
}
