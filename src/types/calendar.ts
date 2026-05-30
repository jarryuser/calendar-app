export type CalendarColor =
  | 'slate' | 'red' | 'orange' | 'yellow'
  | 'green' | 'teal' | 'blue' | 'violet' | 'pink'

export interface Calendar {
  id: string
  name: string
  color: CalendarColor
  isVisible: boolean
  isDefault: boolean
  description?: string
  subscriptionUrl?: string  // .ics URL for subscribed calendars
  lastRefreshed?: string
  createdAt: string
  updatedAt: string
}
