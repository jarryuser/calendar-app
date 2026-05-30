import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ToastProps {
  message: string
  actionLabel?: string
  onAction?: () => void
  onDismiss: () => void
  duration?: number
}

export function Toast({ message, actionLabel, onAction, onDismiss, duration = 5000 }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(() => { setVisible(false); setTimeout(onDismiss, 200) }, duration)
    return () => clearTimeout(timer)
  }, [])

  return createPortal(
    <div
      className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]
        flex items-center gap-3 px-4 py-2.5 rounded-xl
        bg-[#1a1a1a] dark:bg-[#e8e8e8] text-white dark:text-black
        shadow-xl text-sm font-medium
        transition-all duration-200
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      <span>{message}</span>
      {actionLabel && onAction && (
        <button
          onClick={() => { onAction(); onDismiss() }}
          className="underline underline-offset-2 opacity-90 hover:opacity-100 transition-opacity"
        >
          {actionLabel}
        </button>
      )}
      <button
        onClick={() => { setVisible(false); setTimeout(onDismiss, 200) }}
        className="opacity-50 hover:opacity-80 transition-opacity"
      >
        <X size={14} />
      </button>
    </div>,
    document.body
  )
}

// Simple global toast state
type ToastData = Omit<ToastProps, 'onDismiss'>

let _setToast: ((t: ToastData | null) => void) | null = null

export function useToast() {
  const [toast, setToast] = useState<ToastData | null>(null)
  _setToast = setToast

  return {
    toast,
    show: (data: ToastData) => setToast(data),
    dismiss: () => setToast(null),
  }
}

export function showToast(data: ToastData) {
  _setToast?.(data)
}
