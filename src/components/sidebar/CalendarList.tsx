import { useState } from 'react'
import { Plus, MoreHorizontal, Edit2, Trash2, Check, Link, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCalendarStore } from '@/store/calendarStore'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { ALL_COLORS, COLOR_HEX, getEventHex } from '@/utils/colors'
import type { CalendarColor } from '@/types/calendar'
import { clsx } from 'clsx'

function CalendarFormDialog({
  open,
  onClose,
  initialName = '',
  initialColor = 'blue' as CalendarColor,
  initialDesc = '',
  onSave,
  titleKey,
}: {
  open: boolean
  onClose: () => void
  initialName?: string
  initialColor?: CalendarColor
  initialDesc?: string
  onSave: (name: string, color: CalendarColor, desc: string) => void
  titleKey: 'newCalendar' | 'editCalendar'
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initialName)
  const [color, setColor] = useState<CalendarColor>(initialColor)
  const [desc, setDesc] = useState(initialDesc)

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()} title={t(`calendarList.${titleKey}`)} className="max-w-sm">
      <div className="p-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)]">{t('calendarList.fieldName')}</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            className="mt-1 h-8 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)]">{t('calendarList.fieldColor')}</label>
          <div className="mt-1.5 flex gap-1.5 flex-wrap">
            {ALL_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c as CalendarColor)}
                className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                style={{ backgroundColor: COLOR_HEX[c] }}
              >
                {color === c && <Check size={12} className="text-white" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)]">{t('calendarList.fieldDescription')}</label>
          <input
            value={desc}
            onChange={e => setDesc(e.target.value)}
            className="mt-1 h-8 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" onClick={() => { onSave(name, color, desc); onClose() }} disabled={!name.trim()}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

export function CalendarList() {
  const { t } = useTranslation()
  const { calendars, toggleVisibility, create, update, remove, setDefault, subscribe, refreshSubscription, refreshing } = useCalendarStore()
  const [showAdd, setShowAdd] = useState(false)
  const [showSubscribe, setShowSubscribe] = useState(false)
  const [subscribeUrl, setSubscribeUrl] = useState('')
  const [subscribeName, setSubscribeName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const editingCal = editingId ? calendars.find(c => c.id === editingId) : null

  return (
    <div className="px-2 py-2">
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
          {t('sidebar.calendars')}
        </span>
        <div className="flex gap-0.5">
          <button
            onClick={() => setShowSubscribe(s => !s)}
            title="Subscribe to .ics URL"
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--surface-tertiary)] text-[var(--text-tertiary)] transition-colors"
          >
            <Link size={11} />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--surface-tertiary)] text-[var(--text-tertiary)] transition-colors"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {showSubscribe && (
        <div className="mb-2 space-y-1.5 px-1">
          <input
            autoFocus
            placeholder="https://example.com/calendar.ics"
            value={subscribeUrl}
            onChange={e => setSubscribeUrl(e.target.value)}
            className="w-full h-7 rounded border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            placeholder="Calendar name"
            value={subscribeName}
            onChange={e => setSubscribeName(e.target.value)}
            className="w-full h-7 rounded border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            disabled={!subscribeUrl.trim()}
            onClick={async () => {
              if (!subscribeUrl.trim()) return
              await subscribe(subscribeUrl.trim(), subscribeName.trim() || 'Subscribed Calendar', 'teal')
              setSubscribeUrl('')
              setSubscribeName('')
              setShowSubscribe(false)
            }}
            className="w-full h-7 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Subscribe
          </button>
        </div>
      )}

      <div className="space-y-0.5">
        {calendars.map(cal => (
          <div
            key={cal.id}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--r-sm)] group transition-colors"
            style={{ cursor: 'default' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            <button
              onClick={() => toggleVisibility(cal.id)}
              className={clsx(
                'w-[17px] h-[17px] rounded-[5px] flex items-center justify-center shrink-0 transition-all',
              )}
              style={{
                background: cal.isVisible ? getEventHex(cal.color) : 'transparent',
                border: cal.isVisible
                  ? `1.8px solid ${getEventHex(cal.color)}`
                  : `1.8px solid ${getEventHex(cal.color)}88`,
              }}
            >
              {cal.isVisible && <Check size={10} className="text-white" strokeWidth={3.4} />}
            </button>

            <span className="flex-1 text-[13.5px] text-[var(--text-primary)] truncate font-[480]">
              {cal.name}
              {cal.isDefault && (
                <span className="ml-1 text-[10px] text-[var(--text-tertiary)]">
                  ({t('calendarList.defaultBadge')})
                </span>
              )}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--surface-tertiary)] text-[var(--text-tertiary)] transition-all">
                  <MoreHorizontal size={13} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {cal.subscriptionUrl ? (
                  <DropdownMenuItem
                    icon={<RefreshCw size={13} className={refreshing === cal.id ? 'animate-spin' : ''} />}
                    onClick={() => refreshSubscription(cal.id)}
                    disabled={refreshing === cal.id}
                  >
                    Refresh
                  </DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuItem icon={<Edit2 size={13} />} onClick={() => setEditingId(cal.id)}>
                      {t('calendarList.edit')}
                    </DropdownMenuItem>
                    {!cal.isDefault && (
                      <DropdownMenuItem onClick={() => setDefault(cal.id)}>
                        {t('calendarList.setDefault')}
                      </DropdownMenuItem>
                    )}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem icon={<Trash2 size={13} />} destructive onClick={() => remove(cal.id)}>
                  {t('calendarList.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      <CalendarFormDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        titleKey="newCalendar"
        onSave={(name, color, desc) => create({ name, color, description: desc || undefined })}
      />

      {editingCal && (
        <CalendarFormDialog
          open={!!editingId}
          onClose={() => setEditingId(null)}
          titleKey="editCalendar"
          initialName={editingCal.name}
          initialColor={editingCal.color}
          initialDesc={editingCal.description ?? ''}
          onSave={(name, color, desc) => update(editingCal.id, { name, color, description: desc || undefined })}
        />
      )}
    </div>
  )
}
