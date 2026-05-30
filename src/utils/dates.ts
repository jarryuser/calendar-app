import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addDays, addWeeks, addMonths,
  subDays, subWeeks, subMonths,
  format, parseISO, isToday, isSameDay, isSameMonth,
  differenceInMinutes, startOfDay, endOfDay,
  setHours, setMinutes,
} from 'date-fns'

export function getMonthGrid(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end })
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy')
}

export function formatDayOfWeek(date: Date, short = false): string {
  return format(date, short ? 'EEE' : 'EEEE')
}

export function formatTime(date: Date): string {
  return format(date, 'h:mm a')
}

export function formatTimeShort(date: Date): string {
  const mins = date.getMinutes()
  return mins === 0 ? format(date, 'ha') : format(date, 'h:mma')
}

export function navigatePeriod(
  date: Date,
  view: 'month' | 'week' | 'day' | 'agenda' | 'year',
  direction: 1 | -1,
): Date {
  if (view === 'year') {
    const d = new Date(date)
    d.setFullYear(d.getFullYear() + direction)
    return d
  }
  if (view === 'month') return direction > 0 ? addMonths(date, 1) : subMonths(date, 1)
  if (view === 'week') return direction > 0 ? addWeeks(date, 1) : subWeeks(date, 1)
  return direction > 0 ? addDays(date, 1) : subDays(date, 1)
}

export function getRangeForView(
  date: Date,
  view: 'month' | 'week' | 'day' | 'agenda' | 'year',
): { start: Date; end: Date } {
  if (view === 'year') {
    return {
      start: new Date(date.getFullYear(), 0, 1),
      end: new Date(date.getFullYear(), 11, 31, 23, 59, 59),
    }
  }
  if (view === 'month') {
    return {
      start: startOfWeek(startOfMonth(date), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(date), { weekStartsOn: 1 }),
    }
  }
  if (view === 'week') {
    return {
      start: startOfWeek(date, { weekStartsOn: 1 }),
      end: endOfWeek(date, { weekStartsOn: 1 }),
    }
  }
  if (view === 'agenda') {
    return { start: startOfDay(date), end: addDays(endOfDay(date), 60) }
  }
  return { start: startOfDay(date), end: endOfDay(date) }
}

export function eventTopPercent(start: Date): number {
  const minutes = differenceInMinutes(start, startOfDay(start))
  return (minutes / 1440) * 100
}

export function eventHeightPercent(start: Date, end: Date): number {
  const minutes = differenceInMinutes(end, start)
  return Math.max((minutes / 1440) * 100, 0.7)
}

export function snapToGrid(date: Date, minuteSnap = 15): Date {
  const mins = date.getMinutes()
  const snapped = Math.round(mins / minuteSnap) * minuteSnap
  return setMinutes(setHours(date, date.getHours()), snapped)
}

export {
  parseISO, format, isToday, isSameDay, isSameMonth,
  startOfDay, endOfDay, addDays, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
}
