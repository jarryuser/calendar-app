import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CalendarEvent } from '@/types/event'
import { format } from 'date-fns'

export type ViewType = 'month' | 'week' | 'day' | 'agenda' | 'year'
export type DesignTheme = 'editorial' | 'fantastical'

export interface PopoverAnchor {
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}

interface UIState {
  view: ViewType
  selectedDate: string
  searchQuery: string
  isSearchOpen: boolean
  isEventModalOpen: boolean
  editingEventId: string | null
  editingInstanceDate: string | null
  newEventDefaults: Partial<CalendarEvent> | null
  isDarkTheme: boolean
  designTheme: DesignTheme
  sidebarCollapsed: boolean
  mobileMenuOpen: boolean
  showWeekNumbers: boolean
  timezone: string
  popover: { eventId: string; instanceStart: string; anchor: PopoverAnchor } | null

  setView: (view: ViewType) => void
  setSelectedDate: (date: string) => void
  goToToday: () => void
  setSearchQuery: (q: string) => void
  setSearchOpen: (open: boolean) => void
  openNewEvent: (defaults?: Partial<CalendarEvent>) => void
  openEditEvent: (id: string, instanceDate?: string) => void
  closeEventModal: () => void
  openPopover: (eventId: string, instanceStart: string, el: Element) => void
  closePopover: () => void
  toggleTheme: () => void
  toggleSidebar: () => void
  setMobileMenuOpen: (open: boolean) => void
  toggleWeekNumbers: () => void
  setTimezone: (tz: string) => void
  setDesignTheme: (d: DesignTheme) => void
  toggleDesignTheme: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      view: 'month',
      selectedDate: format(new Date(), 'yyyy-MM-dd'),
      searchQuery: '',
      isSearchOpen: false,
      isEventModalOpen: false,
      editingEventId: null,
      editingInstanceDate: null,
      newEventDefaults: null,
      isDarkTheme: false,
      designTheme: 'editorial',
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      showWeekNumbers: false,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      popover: null,

      setView: (view) => set({ view }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      goToToday: () => set({ selectedDate: format(new Date(), 'yyyy-MM-dd') }),

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSearchOpen: (isSearchOpen) => set({ isSearchOpen }),

      openNewEvent: (defaults) => set({
        isEventModalOpen: true,
        editingEventId: null,
        editingInstanceDate: null,
        newEventDefaults: defaults ?? null,
        popover: null,
      }),
      openEditEvent: (id, instanceDate) => set({
        isEventModalOpen: true,
        editingEventId: id,
        editingInstanceDate: instanceDate ?? null,
        newEventDefaults: null,
        popover: null,
      }),
      closeEventModal: () => set({
        isEventModalOpen: false,
        editingEventId: null,
        editingInstanceDate: null,
        newEventDefaults: null,
      }),

      openPopover: (eventId, instanceStart, el) => {
        const r = el.getBoundingClientRect()
        set({
          popover: {
            eventId,
            instanceStart,
            anchor: { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
          },
        })
      },
      closePopover: () => set({ popover: null }),

      toggleTheme: () => set(s => ({ isDarkTheme: !s.isDarkTheme })),
      toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
      toggleWeekNumbers: () => set(s => ({ showWeekNumbers: !s.showWeekNumbers })),
      setTimezone: (timezone) => set({ timezone }),
      setDesignTheme: (designTheme) => set({ designTheme }),
      toggleDesignTheme: () => set(s => ({ designTheme: s.designTheme === 'editorial' ? 'fantastical' : 'editorial' })),
    }),
    {
      name: 'calendar-ui',
      partialize: (s) => ({ view: s.view, isDarkTheme: s.isDarkTheme, designTheme: s.designTheme, sidebarCollapsed: s.sidebarCollapsed, showWeekNumbers: s.showWeekNumbers, timezone: s.timezone }),
    }
  )
)
