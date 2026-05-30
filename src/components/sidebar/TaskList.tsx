import { useState, useMemo } from 'react'
import { format, parseISO, isToday, isPast, startOfDay } from 'date-fns'
import { Plus, CheckSquare, Square, MoreHorizontal, ChevronDown, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTaskStore } from '@/store/taskStore'
import { useCalendarStore } from '@/store/calendarStore'
import { useDateLocale } from '@/i18n/useDateLocale'
import { TaskModal } from '@/components/task/TaskModal'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/DropdownMenu'
import { getEventHex } from '@/utils/colors'
import type { Task } from '@/types/task'
import { clsx } from 'clsx'

function TaskItem({ task, onEdit }: { task: Task; onEdit: (t: Task) => void }) {
  const { toggle } = useTaskStore()
  const { calendars } = useCalendarStore()
  const locale = useDateLocale()
  const cal = calendars.find(c => c.id === task.calendarId)
  const hex = getEventHex(cal?.color)

  const overdue = task.dueDate && !task.completed && isPast(startOfDay(parseISO(task.dueDate))) && !isToday(parseISO(task.dueDate))

  return (
    <div className="flex items-start gap-2 px-1 py-1 rounded-lg hover:bg-[var(--surface-secondary)] group transition-colors">
      <button
        onClick={() => toggle(task.id)}
        className="mt-0.5 shrink-0 transition-colors"
        style={{ color: task.completed ? hex : 'var(--text-tertiary)' }}
      >
        {task.completed
          ? <CheckSquare size={14} />
          : <Square size={14} />
        }
      </button>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(task)}>
        <div className={clsx(
          'text-sm leading-snug truncate',
          task.completed
            ? 'line-through text-[var(--text-tertiary)]'
            : 'text-[var(--text-primary)]'
        )}>
          {task.title}
        </div>
        {task.dueDate && (
          <div className={clsx(
            'text-[10px] mt-0.5',
            overdue ? 'text-red-500' : 'text-[var(--text-tertiary)]'
          )}>
            {isToday(parseISO(task.dueDate))
              ? 'Today'
              : format(parseISO(task.dueDate), 'MMM d', { locale })}
          </div>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-[var(--text-tertiary)] hover:bg-[var(--surface-tertiary)] transition-all">
            <MoreHorizontal size={12} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(task)}>Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => toggle(task.id)}>
            {task.completed ? 'Mark incomplete' : 'Mark complete'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function TaskList() {
  const { t } = useTranslation()
  const { tasks } = useTaskStore()
  const { getDefault } = useCalendarStore()
  const [expanded, setExpanded] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showModal, setShowModal] = useState(false)

  const { active, completed } = useMemo(() => ({
    active: tasks.filter(t => !t.completed).sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    }),
    completed: tasks.filter(t => t.completed).slice(0, 5),
  }), [tasks])

  const openNew = () => {
    setEditingTask(null)
    setShowModal(true)
  }

  const openEdit = (task: Task) => {
    setEditingTask(task)
    setShowModal(true)
  }

  return (
    <>
      <div className="px-2 py-2 border-t border-[var(--border)]">
        <div className="flex items-center justify-between px-1 mb-1">
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider hover:text-[var(--text-secondary)] transition-colors"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {t('tasks.title')}
            {active.length > 0 && (
              <span className="ml-1 bg-[var(--surface-tertiary)] text-[var(--text-secondary)] rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                {active.length}
              </span>
            )}
          </button>
          <button
            onClick={openNew}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--surface-tertiary)] text-[var(--text-tertiary)] transition-colors"
          >
            <Plus size={13} />
          </button>
        </div>

        {expanded && (
          <div className="space-y-0.5">
            {active.length === 0 && (
              <div className="text-xs text-[var(--text-tertiary)] px-1 py-1">{t('tasks.empty')}</div>
            )}
            {active.map(task => (
              <TaskItem key={task.id} task={task} onEdit={openEdit} />
            ))}

            {completed.length > 0 && (
              <>
                <button
                  onClick={() => setShowCompleted(s => !s)}
                  className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] px-1 mt-1 transition-colors"
                >
                  {showCompleted ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  {t('tasks.completed')} ({completed.length})
                </button>
                {showCompleted && completed.map(task => (
                  <TaskItem key={task.id} task={task} onEdit={openEdit} />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <TaskModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingTask(null) }}
        task={editingTask}
        defaultCalendarId={getDefault()?.id}
      />
    </>
  )
}
