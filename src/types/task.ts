export interface Task {
  id: string
  title: string
  notes?: string
  dueDate?: string  // ISO date YYYY-MM-DD
  completed: boolean
  completedAt?: string
  calendarId: string
  createdAt: string
  updatedAt: string
}
