import { create } from 'zustand'
import { db } from '@/db'
import type { Task } from '@/types/task'

interface TaskStore {
  tasks: Task[]
  loading: boolean

  load: () => Promise<void>
  create: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  update: (id: string, data: Partial<Omit<Task, 'id' | 'createdAt'>>) => Promise<void>
  toggle: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  loading: false,

  load: async () => {
    set({ loading: true })
    const tasks = await db.tasks.orderBy('createdAt').toArray()
    set({ tasks, loading: false })
  },

  create: async (data) => {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const task: Task = { ...data, id, createdAt: now, updatedAt: now }
    await db.tasks.add(task)
    set(s => ({ tasks: [...s.tasks, task] }))
    return id
  },

  update: async (id, data) => {
    const now = new Date().toISOString()
    await db.tasks.update(id, { ...data, updatedAt: now })
    set(s => ({
      tasks: s.tasks.map(t => t.id === id ? { ...t, ...data, updatedAt: now } : t),
    }))
  },

  toggle: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    const now = new Date().toISOString()
    const patch = {
      completed: !task.completed,
      completedAt: !task.completed ? now : undefined,
      updatedAt: now,
    }
    await db.tasks.update(id, patch)
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...patch } : t) }))
  },

  remove: async (id) => {
    await db.tasks.delete(id)
    set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }))
  },
}))
