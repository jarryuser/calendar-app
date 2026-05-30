import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'
import { navigatePeriod, format } from '@/utils/dates'
import { parseISO } from 'date-fns'

export function useKeyboardShortcuts() {
  const { view, selectedDate, setView, setSelectedDate, goToToday, openNewEvent, setSearchOpen, closeEventModal, isEventModalOpen } = useUIStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if ((e.target as HTMLElement).isContentEditable) return

      switch (e.key) {
        case 'n':
          e.preventDefault()
          openNewEvent()
          break
        case 'j':
          setSelectedDate(format(navigatePeriod(parseISO(selectedDate), view, 1), 'yyyy-MM-dd'))
          break
        case 'k':
          setSelectedDate(format(navigatePeriod(parseISO(selectedDate), view, -1), 'yyyy-MM-dd'))
          break
        case 't':
          goToToday()
          break
        case '1':
          setView('month')
          break
        case '2':
          setView('week')
          break
        case '3':
          setView('day')
          break
        case '4':
          setView('agenda')
          break
        case '5':
          setView('year')
          break
        case '/':
          e.preventDefault()
          setSearchOpen(true)
          break
        case 'Escape':
          if (isEventModalOpen) closeEventModal()
          else setSearchOpen(false)
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [view, selectedDate, isEventModalOpen, setView, setSelectedDate, goToToday, openNewEvent, setSearchOpen, closeEventModal])
}
