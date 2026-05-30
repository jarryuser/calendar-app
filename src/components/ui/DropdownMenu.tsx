import * as Radix from '@radix-ui/react-dropdown-menu'
import { clsx } from 'clsx'
import { type ReactNode } from 'react'

export const DropdownMenu = Radix.Root
export const DropdownMenuTrigger = Radix.Trigger

interface DropdownMenuContentProps {
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  className?: string
}

export function DropdownMenuContent({ children, align = 'end', className }: DropdownMenuContentProps) {
  return (
    <Radix.Portal>
      <Radix.Content
        align={align}
        sideOffset={6}
        className={clsx(
          'z-50 min-w-[160px] rounded-xl bg-[var(--surface)] shadow-xl border border-[var(--border)] p-1',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          className,
        )}
      >
        {children}
      </Radix.Content>
    </Radix.Portal>
  )
}

interface DropdownMenuItemProps {
  children: ReactNode
  onClick?: () => void
  destructive?: boolean
  disabled?: boolean
  icon?: ReactNode
}

export function DropdownMenuItem({ children, onClick, destructive, disabled, icon }: DropdownMenuItemProps) {
  return (
    <Radix.Item
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg cursor-pointer select-none outline-none',
        'transition-colors',
        destructive
          ? 'text-red-600 dark:text-red-400 data-[highlighted]:bg-red-50 dark:data-[highlighted]:bg-red-950/30'
          : 'text-[var(--text-primary)] data-[highlighted]:bg-[var(--surface-secondary)]',
        disabled && 'opacity-50 pointer-events-none',
      )}
    >
      {icon && <span className="text-[var(--text-secondary)]">{icon}</span>}
      {children}
    </Radix.Item>
  )
}

export const DropdownMenuSeparator = () => (
  <Radix.Separator className="my-1 h-px bg-[var(--border)]" />
)
