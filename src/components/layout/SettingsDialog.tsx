import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTranslation } from 'react-i18next'
import { db } from '@/db'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { createBackup, parseBackup, restoreBackup } from '@/data/backup'
import { resolveConflict } from '@/data/conflicts'
import { downloadFile } from '@/utils/ical'
import { errorMessage, handleAction } from '@/utils/errors'
import { getUserId, logout } from '@/sync/client'
import { syncOnce } from '@/sync/engine'
import { useUIStore } from '@/store/uiStore'
import { TIMEZONES } from '@/utils/timezone'
import { SUPPORTED_LANGUAGES } from '@/i18n'

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const conflicts = useLiveQuery(() => db.syncConflicts.toArray(), []) || []
  const { timezone, setTimezone } = useUIStore()
  const [restore, setRestore] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [permission, setPermission] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  const file = useRef<HTMLInputElement>(null)
  const run = async (action: () => Promise<unknown>) => {
    setError(''); setBusy(true)
    try { await action() } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  return (
    <Dialog open onOpenChange={open => !open && onClose()} title={t('actions.settings')}>
      <div className="p-4 space-y-4">
        <p>{t('auth.signedIn', { username: getUserId() })}</p>
        <label className="block">{t('actions.timezone')}
          <select aria-label={t('actions.timezone')} value={timezone} onChange={event => setTimezone(event.target.value)} className="block w-full bg-[var(--surface)] border rounded p-2">
            {!TIMEZONES.some(group => group.zones.some(zone => zone.value === timezone)) && <option value={timezone}>{timezone}</option>}
            {TIMEZONES.map(group => <optgroup key={group.group} label={group.group}>{group.zones.map(zone => <option key={zone.value} value={zone.value}>{zone.label}</option>)}</optgroup>)}
          </select>
        </label>
        <label className="block">{t('actions.language')}
          <select aria-label={t('actions.language')} value={i18n.resolvedLanguage} onChange={event => void i18n.changeLanguage(event.target.value)} className="block w-full bg-[var(--surface)] border rounded p-2">
            {SUPPORTED_LANGUAGES.map(language => <option key={language.code} value={language.code}>{language.label}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => void run(async () => downloadFile(await createBackup(), 'calendar-backup.json'))}>{t('actions.backup')}</Button>
          <Button disabled={busy} onClick={() => file.current?.click()}>{t('actions.restore')}</Button>
          <input ref={file} className="hidden" aria-label={t('actions.restore')} type="file" accept="application/json,.json" onChange={event => {
            const selected = event.target.files?.[0]
            if (selected) void run(async () => { const text = await selected.text(); parseBackup(text); setRestore(text) })
            event.target.value = ''
          }} />
        </div>
        {restore && <div className="space-y-2 border rounded p-3">
          <p>{t('messages.restoreConfirm')}</p>
          <Button disabled={busy} onClick={() => void run(async () => { await restoreBackup(restore); await i18n.changeLanguage(localStorage.getItem('i18nextLng') || 'en'); setRestore(null) })}>{t('actions.confirmRestore')}</Button>
          <Button onClick={() => setRestore(null)}>{t('common.cancel')}</Button>
        </div>}
        <div>
          <Button disabled={permission !== 'default'} onClick={() => void run(async () => setPermission(await Notification.requestPermission()))}>{t('actions.notifications')}</Button>
          <p className="text-sm mt-1">{t(`notifications.${permission}`)}</p>
        </div>
        <div className="space-y-2">
          <h2 className="font-medium">{t('conflicts.title', { count: conflicts.length })}</h2>
          {conflicts.map(conflict => <div key={conflict.id} className="border rounded p-3 space-y-2">
            <p>{String(conflict.local?.title || conflict.local?.name || conflict.remote.data?.title || conflict.remote.data?.name || conflict.entityId)}</p>
            <details><summary>{t('conflicts.details')}</summary><pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify({ local: conflict.local, server: conflict.remote.data }, null, 2)}</pre></details>
            <Button disabled={busy} onClick={() => void run(async () => { await resolveConflict(conflict, 'local'); await syncOnce() })}>{t('conflicts.local')}</Button>
            <Button disabled={busy} onClick={() => void run(() => resolveConflict(conflict, 'remote'))}>{t('conflicts.remote')}</Button>
          </div>)}
        </div>
        {error && <p role="alert" className="text-red-500">{t('messages.operationFailed')}: {error}</p>}
        <Button onClick={handleAction(async () => { await logout(); await syncOnce(); location.reload() })}>{t('auth.logout')}</Button>
      </div>
    </Dialog>
  )
}
