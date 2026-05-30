import { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Search, Moon, Sun, Menu, Plus, Upload, Download, X, Feather, Sparkles } from 'lucide-react'
import { parseISO, format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '@/store/uiStore'
import { useEventStore } from '@/store/eventStore'
import { useCalendarStore } from '@/store/calendarStore'
import { navigatePeriod } from '@/utils/dates'
import { Button } from '@/components/ui/Button'
import { exportICS, downloadICS } from '@/utils/ical'
import { parseNLPInput } from '@/utils/nlp'
import type { EventInstance } from '@/types/event'
import { getEventHex } from '@/utils/colors'
import { useDateLocale } from '@/i18n/useDateLocale'
import { useIsMobile } from '@/hooks/useIsMobile'
import { SUPPORTED_LANGUAGES } from '@/i18n'
import i18n from '@/i18n'
import { TIMEZONES } from '@/utils/timezone'
import { clsx } from 'clsx'

function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { calendars } = useCalendarStore()
  const { importFromICS, loadRange } = useEventStore()
  const { selectedDate, view } = useUIStore()
  const [calendarId, setCalendarId] = useState(calendars[0]?.id ?? '')
  const [count, setCount] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Reset state every time the dialog opens so "Choose file" button re-appears
  useEffect(() => {
    if (open) {
      setCount(null)
      setCalendarId(calendars[0]?.id ?? '')
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [open])

  if (!open) return null

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const n = await importFromICS(text, calendarId)
    await loadRange(parseISO(selectedDate), view)
    setCount(n)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--surface)] rounded-xl shadow-2xl p-5 w-80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[var(--text-primary)]">{t('importDialog.title')}</h3>
          <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><X size={16} /></button>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)]">{t('importDialog.importInto')}</label>
          <select
            value={calendarId}
            onChange={e => setCalendarId(e.target.value)}
            className="mt-1 h-8 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {calendars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <input ref={fileRef} type="file" accept=".ics" className="hidden" onChange={handleFile} />
        {count === null ? (
          <Button variant="primary" className="w-full" onClick={() => fileRef.current?.click()}>
            <Upload size={14} />
            {t('importDialog.chooseFile')}
          </Button>
        ) : (
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            {t('importDialog.imported', { count })}
          </p>
        )}
      </div>
    </div>
  )
}

export function Header() {
  const { t } = useTranslation()
  const locale = useDateLocale()
  const { view, selectedDate, setView, setSelectedDate, goToToday, openNewEvent, isDarkTheme, toggleTheme, toggleSidebar, setMobileMenuOpen, showWeekNumbers, toggleWeekNumbers, timezone, setTimezone, designTheme, toggleDesignTheme } = useUIStore()
  const isMobile = useIsMobile()
  const { events } = useEventStore()
  const { calendars } = useCalendarStore()
  const { search } = useEventStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<EventInstance[]>([])
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [nlpSuggestion, setNlpSuggestion] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const currentDate = parseISO(selectedDate)

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  const headerTitle = (() => {
    if (view === 'month') return cap(format(currentDate, 'LLLL yyyy', { locale }))
    if (view === 'week') {
      const weekEnd = navigatePeriod(currentDate, 'week', 1)
      return `${cap(format(currentDate, 'LLL d', { locale }))} - ${cap(format(weekEnd, 'LLL d, yyyy', { locale }))}`
    }
    if (view === 'day') return cap(format(currentDate, 'PPPP', { locale }))
    if (view === 'year') return String(currentDate.getFullYear())
    return `${t('header.agenda')} · ${cap(format(currentDate, 'PP', { locale }))}`
  })()

  const handleSearchChange = async (q: string) => {
    setSearchQuery(q)
    if (q.trim().length > 1) {
      const results = await search(q)
      setSearchResults(results)
      const nlp = parseNLPInput(q)
      setNlpSuggestion(nlp ? t('nlp.createSuggestion', { title: nlp.title }) : null)
    } else {
      setSearchResults([])
      setNlpSuggestion(null)
    }
  }

  const handleSearchSelect = (inst: EventInstance) => {
    setSelectedDate(format(parseISO(inst.instanceStart), 'yyyy-MM-dd'))
    setSearchQuery('')
    setSearchResults([])
    setIsSearchFocused(false)
  }

  const handleExport = () => {
    const ics = exportICS(events, 'My Calendar')
    downloadICS(ics)
  }

  const handleNLPCreate = () => {
    if (!searchQuery) return
    const result = parseNLPInput(searchQuery)
    if (result) {
      openNewEvent({ title: result.title, start: result.start.toISOString(), end: result.end.toISOString(), allDay: result.allDay })
    } else {
      openNewEvent({ title: searchQuery })
    }
    setSearchQuery('')
    setSearchResults([])
    setIsSearchFocused(false)
  }

  return (
    <header className="flex items-center justify-between px-5 py-[13px] border-b border-[var(--border)] shrink-0 bg-[var(--surface)]">

      {/* LEFT — sidebar toggle + title */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <button
          onClick={() => (isMobile ? setMobileMenuOpen(true) : toggleSidebar())}
          aria-label="Menu"
          className="w-8 h-8 flex items-center justify-center rounded-[var(--r-sm)] text-[var(--text-tertiary)] shrink-0 transition-colors"
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = '')}
        >
          <Menu size={18} />
        </button>
        <h1
          className="font-display text-[19px] md:text-[26px] font-bold min-w-0 truncate text-[var(--text-primary)]"
          style={{ letterSpacing: '-0.01em' }}
        >
          {headerTitle}
        </h1>
      </div>

      {/* RIGHT — Today + nav + search + utilities + segment + add */}
      <div className="flex items-center gap-2.5">

        {/* Today + arrows */}
        <div className="flex items-center gap-1">
          <button
            onClick={goToToday}
            className="h-[30px] px-3 md:px-3.5 text-[13px] font-[550] rounded-[var(--r-sm)] text-[var(--text-primary)] transition-colors"
            style={{ background: 'var(--surface-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-tertiary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-secondary)')}
          >
            {t('header.today')}
          </button>
          <div className="hidden md:flex gap-0.5">
            <button
              onClick={() => setSelectedDate(format(navigatePeriod(currentDate, view, -1), 'yyyy-MM-dd'))}
              className="w-8 h-8 flex items-center justify-center rounded-[var(--r-sm)] text-[var(--text-secondary)] transition-colors"
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <ChevronLeft size={17} strokeWidth={2.2} />
            </button>
            <button
              onClick={() => setSelectedDate(format(navigatePeriod(currentDate, view, 1), 'yyyy-MM-dd'))}
              className="w-8 h-8 flex items-center justify-center rounded-[var(--r-sm)] text-[var(--text-secondary)] transition-colors"
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <ChevronRight size={17} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* search */}
        <div className="relative hidden md:block w-44 lg:w-56">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            onFocus={e => { setIsSearchFocused(true); (e.target as HTMLElement).style.background = 'var(--surface)' }}
            onBlur={e => { setTimeout(() => setIsSearchFocused(false), 150); (e.target as HTMLElement).style.background = 'var(--surface-secondary)' }}
            onKeyDown={e => {
              if (e.key === 'Enter') handleNLPCreate()
              if (e.key === 'Escape') { setSearchQuery(''); setSearchResults([]); searchRef.current?.blur() }
            }}
            placeholder={t('header.searchPlaceholder')}
            className="h-[30px] w-full rounded-[var(--r-sm)] border border-[var(--border)] pl-8 pr-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            style={{ background: 'var(--surface-secondary)' }}
          />
          {isSearchFocused && (searchResults.length > 0 || nlpSuggestion) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden">
              {nlpSuggestion && (
                <button
                  onClick={handleNLPCreate}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-secondary)] text-left border-b border-[var(--border)] transition-colors"
                >
                  <Plus size={13} className="text-[var(--accent)] shrink-0" />
                  <span className="text-sm" style={{ color: 'var(--accent)' }}>{nlpSuggestion}</span>
                </button>
              )}
              {searchResults.slice(0, 8).map((inst, i) => {
                const color = inst.event.color ?? calendars.find(c => c.id === inst.event.calendarId)?.color
                const hex = getEventHex(color)
                return (
                  <button
                    key={i}
                    onMouseDown={() => handleSearchSelect(inst)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[var(--surface-secondary)] text-left transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)] truncate">{inst.event.title}</div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        {format(parseISO(inst.instanceStart), 'EEE, MMM d', { locale })}
                        {!inst.event.allDay && ` · ${format(parseISO(inst.instanceStart), 'h:mma')}`}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* utility icons */}
        <div className="hidden md:flex items-center gap-0.5">
          <select
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            title="Timezone"
            className="hidden md:block h-[28px] rounded-[var(--r-sm)] border border-[var(--border)] bg-transparent px-1.5 text-[11px] font-medium text-[var(--text-secondary)] focus:outline-none cursor-pointer max-w-[68px]"
          >
            {TIMEZONES.map(group => (
              <optgroup key={group.group} label={group.group}>
                {group.zones.map(z => (
                  <option key={z.value} value={z.value}>{z.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <select
            value={i18n.language}
            onChange={e => i18n.changeLanguage(e.target.value)}
            className="h-[28px] rounded-[var(--r-sm)] border border-[var(--border)] bg-transparent px-1.5 text-[11px] font-medium text-[var(--text-secondary)] focus:outline-none cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          {([
            { icon: <Upload size={13} />, action: () => setShowImport(true), title: 'Import' },
            { icon: <Download size={13} />, action: handleExport, title: 'Export' },
            { icon: <span className={`text-[10px] font-bold ${showWeekNumbers ? '' : 'opacity-40'}`}>W#</span>, action: toggleWeekNumbers, title: 'Week numbers' },
            { icon: designTheme === 'editorial' ? <Feather size={13} /> : <Sparkles size={13} />, action: toggleDesignTheme, title: designTheme === 'editorial' ? 'Design: Editorial (click for Fantastical)' : 'Design: Fantastical (click for Editorial)' },
            { icon: isDarkTheme ? <Sun size={13} /> : <Moon size={13} />, action: toggleTheme, title: 'Theme' },
          ] as const).map(({ icon, action, title }, i) => (
            <button
              key={i}
              onClick={action as () => void}
              title={title as string}
              className="w-7 h-7 flex items-center justify-center rounded-[var(--r-sm)] text-[var(--text-secondary)] transition-colors"
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* segment control — hidden on mobile */}
        <div className="hidden md:flex seg-control">
          {(['month', 'week', 'day', 'agenda', 'year'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={clsx('seg-btn', view === v && 'active')}>
              {t(`header.${v}`)}
            </button>
          ))}
        </div>

        {/* add button */}
        <button
          onClick={() => openNewEvent()}
          aria-label={t('header.new')}
          className="w-[34px] h-[34px] flex items-center justify-center rounded-[var(--r-sm)] text-white transition-all shrink-0"
          style={{ background: 'var(--accent)' }}
          onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.08)')}
          onMouseLeave={e => (e.currentTarget.style.filter = '')}
        >
        <Plus size={18} strokeWidth={2.2} />
        </button>

      </div>{/* end right */}

      <ImportDialog open={showImport} onClose={() => setShowImport(false)} />
    </header>
  )
}
