import i18n from '@/i18n'
import { showToast } from '@/components/ui/Toast'

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : i18n.t('messages.operationFailed')
}
export function reportError(error: unknown) {
  showToast({ message: `${i18n.t('messages.operationFailed')}: ${errorMessage(error)}`, duration: 8000 })
}
export function handleAction(action: () => unknown) {
  return () => { void Promise.resolve().then(action).catch(reportError) }
}
