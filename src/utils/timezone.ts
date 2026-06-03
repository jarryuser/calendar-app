import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz'
import { parseISO } from 'date-fns'

export function toLocalTime(iso: string, timezone: string): Date {
  return toZonedTime(parseISO(iso), timezone)
}

// "YYYY-MM-DD" bucket key for an ISO instant in the given timezone.
// Date-only strings (all-day events) are returned as-is.
export function dayKeyInTz(iso: string, timezone: string): string {
  if (iso.length === 10) return iso
  return formatInTimeZone(parseISO(iso), timezone, 'yyyy-MM-dd')
}

export function toDatetimeLocalTz(iso: string, timezone: string): string {
  return formatInTimeZone(parseISO(iso), timezone, "yyyy-MM-dd'T'HH:mm")
}

export function fromDatetimeLocalTz(val: string, timezone: string): string {
  return fromZonedTime(val + ':00', timezone).toISOString()
}

export function getTzAbbrev(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en', { timeZone: timezone, timeZoneName: 'short' })
      .formatToParts(new Date())
      .find(p => p.type === 'timeZoneName')?.value ?? timezone
  } catch {
    return timezone
  }
}

export const TIMEZONES: { group: string; zones: { value: string; label: string }[] }[] = [
  { group: 'UTC', zones: [{ value: 'UTC', label: 'UTC' }] },
  { group: 'Europe', zones: [
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
    { value: 'Europe/Bratislava', label: 'Bratislava (CET/CEST)' },
    { value: 'Europe/Kyiv', label: 'Kyiv (EET/EEST)' },
    { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
  ]},
  { group: 'Americas', zones: [
    { value: 'America/New_York', label: 'New York (ET)' },
    { value: 'America/Chicago', label: 'Chicago (CT)' },
    { value: 'America/Denver', label: 'Denver (MT)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PT)' },
    { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  ]},
  { group: 'Asia / Middle East', zones: [
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  ]},
  { group: 'Pacific', zones: [
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
  ]},
]
