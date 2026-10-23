import { addDays, format, parseISO } from 'date-fns'
import { dayBounds, dayKeyInTz } from './timezone'
import type { EventInstance } from '@/types/event'

export function instancesByDay(instances: EventInstance[], timezone: string, firstDay: string, lastDay: string) {
  const result = new Map<string, EventInstance[]>()
  let day = parseISO(firstDay)
  while (format(day, 'yyyy-MM-dd') <= lastDay) {
    const key = format(day, 'yyyy-MM-dd')
    const nextKey = format(addDays(day, 1), 'yyyy-MM-dd')
    const bounds = dayBounds(key, timezone)
    const rows: EventInstance[] = []
    for (const instance of instances) {
      const { instanceStart: start, instanceEnd: end } = instance
      if (instance.event.allDay) {
        if (start.slice(0, 10) < nextKey && end.slice(0, 10) > key) rows.push({ ...instance, segmentDay: key })
      } else if (Date.parse(start) < bounds.end.getTime() && Date.parse(end) > bounds.start.getTime()) {
        rows.push({ ...instance, segmentDay: key, segmentStart: new Date(Math.max(Date.parse(start), bounds.start.getTime())).toISOString(), segmentEnd: new Date(Math.min(Date.parse(end), bounds.end.getTime())).toISOString() })
      }
    }
    result.set(key, rows)
    day = addDays(day, 1)
  }
  return result
}

export function segmentMinutes(instance: EventInstance, timezone: string) {
  const start = instance.segmentStart || instance.instanceStart
  const end = instance.segmentEnd || instance.instanceEnd
  const wallMinute = (value: string) => {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(value.length === 10 ? parseISO(value) : new Date(value)).split(':').map(Number)
    return parts[0] * 60 + parts[1]
  }
  const startMin = wallMinute(start)
  const endMin = dayKeyInTz(end, timezone) > dayKeyInTz(start, timezone) ? 1440 : wallMinute(end)
  return { startMin, durationMin: Math.max(15, endMin - startMin) }
}
