import { useTranslation } from 'react-i18next'
import { type RecurrenceRule, type RecurrenceFrequency, type WeekDay } from '@/types/event'
import { recurrenceRuleToText } from '@/utils/recurrence'

interface RecurrenceEditorProps {
  value?: RecurrenceRule
  onChange: (rule?: RecurrenceRule) => void
  startDate: string
}

const WEEKDAYS: { value: WeekDay; key: string }[] = [
  { value: 'MO', key: 'Mo' },
  { value: 'TU', key: 'Tu' },
  { value: 'WE', key: 'We' },
  { value: 'TH', key: 'Th' },
  { value: 'FR', key: 'Fr' },
  { value: 'SA', key: 'Sa' },
  { value: 'SU', key: 'Su' },
]

export function RecurrenceEditor({ value, onChange }: RecurrenceEditorProps) {
  const { t } = useTranslation()
  const rule = value ?? { frequency: 'weekly' as RecurrenceFrequency, interval: 1 }

  const FREQUENCIES: { value: RecurrenceFrequency; label: string }[] = [
    { value: 'daily', label: t('recurrence.daily') },
    { value: 'weekly', label: t('recurrence.weekly') },
    { value: 'monthly', label: t('recurrence.monthly') },
    { value: 'yearly', label: t('recurrence.yearly') },
  ]

  const unitLabel = {
    daily: t('recurrence.unitDays'),
    weekly: t('recurrence.unitWeeks'),
    monthly: t('recurrence.unitMonths'),
    yearly: t('recurrence.unitYears'),
  }[rule.frequency]

  const update = (patch: Partial<RecurrenceRule>) => onChange({ ...rule, ...patch })

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select
          value={rule.frequency}
          onChange={e => update({ frequency: e.target.value as RecurrenceFrequency })}
          className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {FREQUENCIES.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        <span className="text-sm text-[var(--text-secondary)]">{t('recurrence.every')}</span>

        <input
          type="number"
          min={1}
          max={99}
          value={rule.interval}
          onChange={e => update({ interval: Math.max(1, parseInt(e.target.value) || 1) })}
          className="h-8 w-16 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <span className="text-sm text-[var(--text-secondary)]">{unitLabel}</span>
      </div>

      {rule.frequency === 'weekly' && (
        <div className="flex gap-1">
          {WEEKDAYS.map(d => {
            const active = rule.byWeekDay?.includes(d.value)
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => {
                  const current = rule.byWeekDay ?? []
                  const next = active ? current.filter(x => x !== d.value) : [...current, d.value]
                  update({ byWeekDay: next.length ? next : undefined })
                }}
                className="w-7 h-7 rounded-full text-xs font-medium transition-colors"
                style={
                  active
                    ? { background: 'var(--accent)', color: '#fff' }
                    : { background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }
                }
              >
                {d.key}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--text-secondary)]">{t('recurrence.ends')}</span>
        <select
          value={rule.count ? 'count' : rule.until ? 'until' : 'never'}
          onChange={e => {
            const v = e.target.value
            if (v === 'never') update({ count: undefined, until: undefined })
            else if (v === 'count') update({ count: 10, until: undefined })
            else update({ until: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), count: undefined })
          }}
          className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="never">{t('recurrence.endsNever')}</option>
          <option value="count">{t('recurrence.endsAfter')}</option>
          <option value="until">{t('recurrence.endsOn')}</option>
        </select>

        {rule.count !== undefined && (
          <input
            type="number"
            min={1}
            value={rule.count}
            onChange={e => update({ count: Math.max(1, parseInt(e.target.value) || 1) })}
            className="h-8 w-20 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}

        {rule.until && (
          <input
            type="date"
            value={rule.until.slice(0, 10)}
            onChange={e => update({ until: e.target.value })}
            className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      {value && (
        <p className="text-xs text-[var(--text-tertiary)]">{recurrenceRuleToText(rule)}</p>
      )}
    </div>
  )
}
