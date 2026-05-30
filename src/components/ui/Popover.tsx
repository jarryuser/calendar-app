import * as RadixPopover from '@radix-ui/react-popover'
import { clsx } from 'clsx'
import { type ReactNode } from 'react'

interface PopoverProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger: ReactNode
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function Popover({ open, onOpenChange, trigger, children, align = 'center', side = 'bottom', className }: PopoverProps) {
  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align={align}
          side={side}
          sideOffset={6}
          className={clsx(
            'z-50 rounded-xl bg-[var(--surface)] shadow-xl border border-[var(--border)]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            className,
          )}
        >
          {children}
          <RadixPopover.Arrow className="fill-[var(--surface)]" />
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  )
}
