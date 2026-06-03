<div align="center">

# Calendar

**Open-source personal calendar with full offline support - month, week, day, agenda, and year views, recurring events, natural language input, two design themes, and a native desktop app. No accounts, no telemetry, no server required**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tauri](https://img.shields.io/badge/Tauri-v2-24C8DB?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**English** · [Українська](README.uk.md) · [Slovenčina](README.sk.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

</div>

---

## Overview

Calendar is a fully client-side web app that stores everything in the browser's IndexedDB. There is no backend, no authentication, and no network calls after the page loads. Your events never leave your device unless you explicitly export them

The interface is modelled after Google Calendar and Fantastical - keyboard-first navigation, time-grid week/day views with overlap layout, natural language parsing in the search bar, recurring event editing with per-instance exceptions, drag-and-drop rescheduling, and two switchable design themes

---

## Download

Pre-built binaries are published automatically with every release via GitHub Actions:

| Platform | Download |
|---|---|
| macOS (Apple Silicon M1/M2/M3) | `Calendar_*_aarch64.dmg` |
| macOS (Intel) | `Calendar_*_x64.dmg` |
| Windows | `Calendar_*_x64-setup.exe` |
| Linux (AppImage) | `Calendar_*_amd64.AppImage` |
| Linux (.deb) | `Calendar_*_amd64.deb` |

→ **[Latest release](../../releases/latest)**

---

## Features

| ✨ | Feature | Details |
|---|---|---|
| 📅 | **Five views** | Month, Week, Day, Agenda, Year - switch with one keystroke or the header toggle |
| ✏️ | **Rich event editor** | Title, date/time, all-day, location, description, color, calendar, multiple reminders |
| 🔁 | **Recurring events** | Daily, weekly, monthly, yearly with custom interval; edit this / this & following / all |
| 🎨 | **Per-event color** | 9 colors per event, independent of the calendar color |
| 📚 | **Multiple calendars** | Create any number of calendars, toggle visibility, set a default |
| ☑️ | **Tasks / Todos** | Task list in sidebar with due dates, notes, and completion toggle |
| 🔍 | **Instant search** | Full-text search across title, description, and location |
| 💬 | **Natural language input** | Type "Meeting tomorrow at 3pm" in the search bar and press Enter to pre-fill the event form |
| 📤 | **iCal import / export** | Import `.ics` files from any calendar app; export all events to a standard `.ics` file |
| 🔔 | **Reminders** | Browser notifications at a configurable time before each event |
| ⌨️ | **Keyboard shortcuts** | Navigate, create, and switch views without touching the mouse |
| 🌍 | **Timezone support** | IANA timezone selector; all times displayed and saved in the selected zone |
| 🌙 | **Dark / light theme** | System-independent toggle, preference persisted locally |
| 🎨 | **Two design themes** | Editorial (warm cream + serif) and Fantastical (neutral, Apple-like) - switch live in the header |
| 📱 | **Mobile layout** | Slide-in drawer sidebar, bottom navigation bar, swipe left/right to navigate |
| 🖥️ | **Native desktop app** | Tauri v2 - ~10 MB binary, works offline, IndexedDB persists across sessions |
| 📵 | **100% offline** | Everything runs in the browser or native WebView; IndexedDB is the only storage |

---

## Tech stack

| Layer | Tool | Why |
|---|---|---|
| Language | TypeScript 5.5 | Type safety throughout - events, store actions, DB schema |
| UI | React 18 + Vite 5 | Fast HMR, concurrent rendering for smooth view transitions |
| Styling | Tailwind CSS v3 | Utility-first, dark mode via `class` strategy, CSS variables for semantic tokens |
| State | Zustand | Minimal, selector-based subscriptions; isolated stores per domain |
| Storage | Dexie.js (IndexedDB) | Typed wrapper with indexed queries and transactional writes |
| Date math | date-fns + date-fns-tz | Tree-shakeable, timezone-aware formatting |
| Recurrence | rrule | Full RFC 5545 RRULE parsing and expansion via `rule.between()` |
| NLP | chrono-node | Natural language date/time parsing from free-text input |
| iCal | ical.js | RFC 5545 compliant import and export |
| Drag & drop | @dnd-kit | Accessible drag-and-drop with live preview and 15-minute snap |
| Components | Radix UI primitives | Accessible dialogs, dropdowns, and popovers with zero styling opinions |
| Icons | lucide-react | Consistent icon set, tree-shakeable |
| Desktop | Tauri v2 | System WebView wrapper, ~10 MB binary, no Electron overhead |
| i18n | react-i18next | 5 languages: EN, SK, UK, DE, RU |

---

## Getting started

```bash
git clone https://github.com/jarryuser/calendar.git
cd calendar
npm install
npm run dev        # → http://localhost:5173
```

No environment variables, no API keys, no configuration needed. Open the URL and start adding events

To build the web app for production:

```bash
npm run build      # outputs to dist/
npm run preview    # serve the built output locally
```

The output is a static site - deploy it anywhere: GitHub Pages, Netlify, Cloudflare Pages, or a plain nginx server

---

## Desktop app (Tauri)

The same codebase ships as a native desktop app via [Tauri](https://tauri.app/) v2. It uses the system WebView (WKWebView on macOS, WebView2 on Windows, WebKitGTK on Linux), so the binary is ~10 MB and IndexedDB works exactly as in the browser

**Quick start:**

```bash
# Install Rust if you don't have it
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# macOS - Command Line Tools (if not already installed)
xcode-select --install

# Linux - WebKit and build tools
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

# Launch in a native window with hot reload
npm run tauri:dev

# Build a release bundle
npm run tauri:build
```

Build output: `src-tauri/target/release/bundle/`

**Platform outputs:**

| Platform | Output |
|---|---|
| macOS | `.app` + `.dmg` |
| Windows | `.exe` installer + `.msi` |
| Linux | `.AppImage` + `.deb` |

**Signing for distribution (macOS):** unsigned apps trigger Gatekeeper on other machines. To distribute publicly, sign and notarize with an Apple Developer ID - see the [Tauri code-signing guide](https://tauri.app/distribute/sign/macos/)

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `n` | New event |
| `j` | Next period (day / week / month depending on view) |
| `k` | Previous period |
| `t` | Go to today |
| `1` | Month view |
| `2` | Week view |
| `3` | Day view |
| `4` | Agenda view |
| `5` | Year view |
| `/` | Focus search |
| `Esc` | Close modal / clear search |

Shortcuts are suppressed when focus is inside an input or textarea

---

## Project structure

```
src/
├── types/
│   ├── event.ts           - CalendarEvent, RecurrenceRule, EventInstance
│   ├── calendar.ts        - Calendar, CalendarColor
│   └── task.ts            - Task
├── db/
│   └── index.ts           - Dexie schema, seedDefaultCalendar()
├── store/
│   ├── uiStore.ts         - view, selectedDate, modal state, themes
│   ├── calendarStore.ts   - calendars CRUD + .ics subscriptions
│   ├── eventStore.ts      - events CRUD, range loading, iCal import
│   └── taskStore.ts       - tasks CRUD
├── utils/
│   ├── recurrence.ts      - expandRecurringEvents() via rrule.between()
│   ├── ical.ts            - importICS() / exportICS() via ical.js
│   ├── nlp.ts             - parseNLPInput() via chrono-node
│   ├── timezone.ts        - date-fns-tz helpers
│   ├── dates.ts           - grid helpers, range calculation
│   └── colors.ts          - 9-color token map
├── hooks/
│   ├── useKeyboardShortcuts.ts
│   ├── useNotifications.ts
│   ├── useTheme.ts
│   ├── useSwipe.ts
│   └── useIsMobile.ts
└── components/
    ├── layout/            - AppLayout, Header, BottomNav (mobile)
    ├── sidebar/           - MiniCalendar, CalendarList, TaskList
    ├── views/             - MonthView, WeekView, DayView, AgendaView, YearView
    ├── event/             - EventModal, EventPopover, RecurrenceEditor, ColorPicker
    ├── task/              - TaskModal
    └── ui/                - Button, Dialog, Popover, Toast, DropdownMenu
```

---

## How recurring events work

Recurring events are stored once as a master record with an `rrule`-compatible `recurrence` field. When a view loads, `expandRecurringEvents()` calls `rrule.between(rangeStart, rangeEnd)` for each master record and materialises the visible instances in memory - nothing is written to the database

Editing a single instance creates an exception record with `recurringEventId` pointing at the master and `exceptionDate` marking which occurrence it replaces. Deleting a single instance writes a tombstone to the `deletedInstances` table. The master record is never modified in either case

This keeps the database small and makes bulk edits ("change all future instances") a single master update

---

## Roadmap

### ✅ Done

- [x] Month, week, day, agenda, and year views
- [x] Event CRUD with full field set (title, datetime, all-day, location, description, color, calendar, multiple reminders)
- [x] Recurring events with daily / weekly / monthly / yearly frequency, custom interval, weekday selection, and end conditions
- [x] Edit-scope dialog for recurring events (this / this & following / all)
- [x] Drag-and-drop - move across days (month), reschedule and resize in week/day view, 15-minute snap, undo toast
- [x] Event popover - quick-view on click before opening the full editor
- [x] Multiple calendars with per-calendar color, visibility toggle, and default assignment
- [x] Tasks / Todos with due dates, notes, and calendar assignment
- [x] .ics URL subscriptions - subscribe to public calendars by URL (holidays, sports, etc.)
- [x] Full-text search across title, description, and location
- [x] Natural language input via chrono-node
- [x] iCal `.ics` import and export (RFC 5545)
- [x] Browser Notification API reminders with Service Worker background support
- [x] Keyboard shortcuts for navigation, view switching, and event creation
- [x] Week numbers toggle
- [x] Timezone support (IANA, persisted)
- [x] Dark / light theme with CSS variable tokens
- [x] Two switchable design themes (Editorial / Fantastical)
- [x] 5-language i18n (EN, SK, UK, DE, RU) with correct grammatical forms
- [x] Mobile layout - drawer sidebar, bottom nav, swipe gestures
- [x] Native desktop app via Tauri v2 (macOS, Windows, Linux)
- [x] Automated multi-platform releases via GitHub Actions

### 💡 Ideas under consideration

- [ ] **Event templates** - save frequently used event configurations for one-click reuse
- [ ] **Year view improvements** - event dots with count badges, click to see day detail
- [ ] **Focus mode** - hide the sidebar and show only the time grid
- [ ] **Statistics view** - time spent per calendar per week, busiest hours heatmap
- [ ] **Plugin API** - allow third-party scripts to subscribe to event changes

---

## Known limitations

- **Notifications require the tab or app to be open** - the Service Worker fires notifications when the tab is in the background, but not when the browser is fully closed
- **iCal import ignores VTIMEZONE components** - events are imported as-is; if the source file uses non-UTC floating times, the displayed time may differ from the original app
- **No cross-device sync** - IndexedDB is per-browser / per-app; a second device starts with an empty calendar. Use the iCal export/import to move data manually
- **RRULE expansion is in-memory** - very long recurring series (daily for 10 years) expand correctly but are not paginated; loading a wide date range may be slow for extreme cases

---

## Contributing

Issues and pull requests are welcome. If you have a feature idea or run into a bug, open an issue first so we can agree on the approach before you write code

---

## License

MIT © [Dmytro Filiurskyi](https://github.com/jarryuser)
