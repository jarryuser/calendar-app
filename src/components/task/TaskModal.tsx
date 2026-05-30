import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useTaskStore } from '@/store/taskStore'
import { useCalendarStore } from '@/store/calendarStore'
import { Trash2 } from 'lucide-react'
import type { Task } from '@/types/task'

interface TaskModalProps {
  open: boolean
  onClose: () => void
  task?: Task | null
  defaultCalendarId?: string
  defaultDueDate?: string
}

export function TaskModal({ open, onClose, task, defaultCalendarId, defaultDueDate }: TaskModalProps) {
  const { t } = useTranslation()
  const { create, update, remove } = useTaskStore()
  const { calendars, getDefault } = useCalendarStore()

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [calendarId, setCalendarId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (task) {
      setTitle(task.title)
      setNotes(task.notes ?? '')
      setDueDate(task.dueDate ?? '')
      setCalendarId(task.calendarId)
    } else {
      setTitle('')
      setNotes('')
      setDueDate(defaultDueDate ?? '')
      setCalendarId(defaultCalendarId ?? getDefault()?.id ?? '')
    }
  }, [open, task])

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      const data = {
        title: title.trim(),
        notes: notes.trim() || undefined,
        dueDate: dueDate || undefined,
        completed: task?.completed ?? false,
        completedAt: task?.completedAt,
        calendarId,
      }
      if (task) {
        await update(task.id, data)
      } else {
        await create(data)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!task) return
    await remove(task.id)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()} className="max-w-md">
      <div className="p-4 space-y-3">
        <input
          autoFocus
          placeholder={t('tasks.titlePlaceholder')}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          className="w-full text-base font-medium bg-transparent border-0 border-b-2 border-[var(--border)] focus:outline-none focus:border-blue-500 pb-1 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-colors"
        />

        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-[var(--text-secondary)] w-16 shrink-0">
            {t('tasks.dueDate')}
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-[var(--text-secondary)] w-16 shrink-0">
            {t('calendarList.defaultBadge')}
          </label>
          <select
            value={calendarId}
            onChange={e => setCalendarId(e.target.value)}
            className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {calendars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <textarea
            placeholder={t('tasks.notesPlaceholder')}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
          {task ? (
            <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
              <Trash2 size={14} />
              {t('eventModal.delete')}
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>{t('eventModal.cancel')}</Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={!title.trim() || saving}>
              {saving ? t('eventModal.saving') : task ? t('eventModal.save') : t('tasks.add')}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
