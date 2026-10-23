import { addHours, addDays } from 'date-fns'

export interface NLPResult {
  title: string
  start: Date
  end: Date
  allDay: boolean
}

export async function parseNLPInput(text: string, refDate?: Date): Promise<NLPResult | null> {
  const chrono = await import('chrono-node')
  const results = chrono.parse(text, refDate ?? new Date(), { forwardDate: true })
  if (!results.length) return null

  const parsed = results[0]
  const start = parsed.start.date()

  // если время не указано явно - считаем all-day
  const allDay = !parsed.start.isCertain('hour')

  let end: Date
  if (parsed.end) {
    end = parsed.end.date()
  } else {
    end = allDay ? addDays(start, 1) : addHours(start, 1)
  }

  // убираем найденную временную фразу из title
  const titleRaw = text.slice(0, parsed.index) + text.slice(parsed.index + parsed.text.length)
  const title = titleRaw.replace(/\s+/g, ' ').trim() || 'New event'

  return { title, start, end, allDay }
}
