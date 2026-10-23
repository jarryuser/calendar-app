import { useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

interface ToastProps { message: string; actionLabel?: string; onAction?: () => unknown; onDismiss: () => void; duration?: number }
type ToastData = Omit<ToastProps, 'onDismiss'> & { id: number }
let current: ToastData | null = null
let sequence = 0
const listeners = new Set<() => void>()
function emit() { listeners.forEach(listener => listener()) }
export function showToast(data: Omit<ToastData, 'id'>) { current = { ...data, id: ++sequence }; emit() }
export function useToast() {
  const toast = useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener) } }, () => current)
  return { toast, dismiss: () => { current = null; emit() } }
}
export function Toast({ message, actionLabel, onAction, onDismiss, duration = 5000 }: ToastProps) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const animation = requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(onDismiss, duration)
    return () => { cancelAnimationFrame(animation); clearTimeout(timer) }
  }, [duration, message])
  return createPortal(
    <div role="status" aria-live="polite" className={`fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#1a1a1a] text-white shadow-xl text-sm transition-opacity ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <span>{message}</span>
      {actionLabel && onAction && <button onClick={() => {
        onDismiss()
        void Promise.resolve().then(onAction).catch(() => showToast({ message: t('messages.operationFailed') }))
      }} className="underline">{actionLabel}</button>}
      <button aria-label={t('actions.close')} onClick={onDismiss}><X size={14} /></button>
    </div>, document.body,
  )
}
