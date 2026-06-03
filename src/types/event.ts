export type EventColor =
  | 'slate' | 'red' | 'orange' | 'yellow'
  | 'green' | 'teal' | 'blue' | 'violet' | 'pink'

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export type WeekDay = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  interval: number
  byWeekDay?: WeekDay[]
  byMonthDay?: number[]
  count?: number
  until?: string
}

export interface Reminder {
  id: string
  minutesBefore: number
}

export interface CalendarEvent {
  id: string
  uid?: string            // iCal UID, used to de-duplicate re-imports
  title: string
  start: string
  end: string
  allDay: boolean
  description?: string
  location?: string
  color?: EventColor
  calendarId: string
  reminders: Reminder[]
  recurrence?: RecurrenceRule
  recurringEventId?: string
  exceptionDate?: string
  isException?: boolean
  createdAt: string
  updatedAt: string
}

export interface EventInstance {
  event: CalendarEvent
  instanceStart: string
  instanceEnd: string
  isRecurring: boolean
}

export type RecurringEditScope = 'this' | 'thisAndFollowing' | 'all'
