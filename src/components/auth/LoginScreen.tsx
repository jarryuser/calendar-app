import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { login, setServerUrl, getServerUrl } from '@/sync/client'

interface LoginScreenProps {
  onLogin: () => void | Promise<void>
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const { t } = useTranslation()
  const [username, setUsername] = useState('personal')
  const [serverUrl, setUrl] = useState(getServerUrl())
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return
    setError('')
    setLoading(true)
    try {
      setServerUrl(serverUrl)
      await login(password, username)
      await onLogin()
    } catch {
      setError(t('auth.failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--surface)] p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4"
      >
        <h1 className="text-xl font-semibold text-center text-[var(--text-primary)]">
          {t('auth.title')}
        </h1>
        <p className="text-sm text-center text-[var(--text-secondary)]">
          {t('auth.description')}
        </p>

        <div className="space-y-3">
          <label className="block text-sm text-[var(--text-secondary)]">
            {t('auth.username')}
            <input aria-label={t('auth.username')} autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} className="w-full h-9 rounded-md border bg-[var(--surface)] px-3" />
          </label>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              {t('auth.server')}
            </label>
            <input
              aria-label={t('auth.server')}
              type="text"
              value={serverUrl}
              onChange={e => setUrl(e.target.value)}
              placeholder="/api"
              className="w-full h-9 px-3 text-sm rounded-md border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              {t('auth.password')}
            </label>
            <input
              aria-label={t('auth.password')}
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('auth.password')}
              autoFocus
              className="w-full h-9 px-3 text-sm rounded-md border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={loading || !password.trim()}
        >
          {t(loading ? 'auth.connecting' : 'auth.connect')}
        </Button>
      </form>
    </div>
  )
}
