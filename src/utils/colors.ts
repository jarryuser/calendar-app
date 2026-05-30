import type { EventColor } from '@/types/event'

export interface ColorTokens {
  bg: string
  bgLight: string
  border: string
  text: string
  dot: string
}

export const COLOR_MAP: Record<EventColor, ColorTokens> = {
  slate:  { bg: 'bg-slate-600',  bgLight: 'bg-slate-100 dark:bg-slate-800',  border: 'border-slate-600',  text: 'text-slate-700 dark:text-slate-200',  dot: 'bg-slate-500' },
  red:    { bg: 'bg-red-600',    bgLight: 'bg-red-100 dark:bg-red-900/40',    border: 'border-red-500',    text: 'text-red-700 dark:text-red-300',      dot: 'bg-red-500' },
  orange: { bg: 'bg-orange-600', bgLight: 'bg-orange-100 dark:bg-orange-900/40', border: 'border-orange-500', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
  yellow: { bg: 'bg-yellow-500', bgLight: 'bg-yellow-100 dark:bg-yellow-900/40', border: 'border-yellow-500', text: 'text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500' },
  green:  { bg: 'bg-green-600',  bgLight: 'bg-green-100 dark:bg-green-900/40',  border: 'border-green-500',  text: 'text-green-700 dark:text-green-300',  dot: 'bg-green-500' },
  teal:   { bg: 'bg-teal-600',   bgLight: 'bg-teal-100 dark:bg-teal-900/40',   border: 'border-teal-500',   text: 'text-teal-700 dark:text-teal-300',   dot: 'bg-teal-500' },
  blue:   { bg: 'bg-blue-600',   bgLight: 'bg-blue-100 dark:bg-blue-900/40',   border: 'border-blue-500',   text: 'text-blue-700 dark:text-blue-300',   dot: 'bg-blue-500' },
  violet: { bg: 'bg-violet-600', bgLight: 'bg-violet-100 dark:bg-violet-900/40', border: 'border-violet-500', text: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' },
  pink:   { bg: 'bg-pink-600',   bgLight: 'bg-pink-100 dark:bg-pink-900/40',   border: 'border-pink-500',   text: 'text-pink-700 dark:text-pink-300',   dot: 'bg-pink-500' },
}

export const COLOR_HEX: Record<EventColor, string> = {
  slate: '#475569',
  red: '#dc2626',
  orange: '#ea580c',
  yellow: '#ca8a04',
  green: '#16a34a',
  teal: '#0d9488',
  blue: '#2563eb',
  violet: '#7c3aed',
  pink: '#db2777',
}

export const ALL_COLORS: EventColor[] = [
  'blue', 'violet', 'pink', 'red', 'orange', 'yellow', 'green', 'teal', 'slate',
]

export function getEventColor(color?: EventColor): ColorTokens {
  return COLOR_MAP[color ?? 'blue']
}

export function getEventHex(color?: EventColor): string {
  return COLOR_HEX[color ?? 'blue']
}
