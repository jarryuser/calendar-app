<div align="center">

# Calendar

**Personal calendar with local storage, authenticated cross-device synchronization, recurring events, tasks, backups and a native desktop app**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tauri](https://img.shields.io/badge/Tauri-v2-24C8DB?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**English** · [Українська](README.uk.md) · [Slovenčina](README.sk.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

</div>

---

## Overview

Calendar keeps a local working copy in IndexedDB and synchronizes it with a Cloudflare Pages Functions / D1 server after sign-in. Each server and user has a separate local database. Sessions expire after eight hours; the web app uses an HttpOnly cookie and the desktop client keeps its bearer token in memory

Edits work against the local database and synchronize when the server is available. Reloading offline requires a previously cached production build and a locally remembered unexpired session; signing in and renewing an expired session require connectivity

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
| 🔄 | **Revision-based sync** | Per-user D1 storage, paginated journal, explicit conflict resolution |
| 💾 | **Backups** | Full local JSON backup and restore; scheduled D1 export and restore validation |

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

Use Node.js 24 LTS, npm, and a Cloudflare account for deployment; local development uses Wrangler's local D1 database

```bash
npm ci
npm run db:migrate:local
```

Create an untracked `.dev.vars` with a long random password / signing secret

```dotenv
AUTH_TOKEN=replace-with-a-long-random-secret
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Start the frontend and API in separate terminals

```bash
npm run dev
npm run pages:dev
```

Open `http://localhost:5173`, leave the server URL as `/api`, use the username `personal` and the password from `AUTH_TOKEN`

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser suite runs against the real Functions handlers backed by a temporary SQLite database; it does not use your Cloudflare account or production data

### Deploying and migrating

Set the D1 database ID in `wrangler.jsonc` to your own database and configure the Pages secret `AUTH_TOKEN`; configure `ALLOWED_ORIGINS` when a separate frontend origin is used

```bash
npm run backup:d1
npm run db:migrate:remote
npm run pages:deploy
```

For a new empty database, run the migration before the first backup. For an existing database, back up before migrating; `0001_revision_sync.sql` copies legacy records into the `personal` account and retains the original tables

Deploy the client and Functions together. Protocol 2 rejects older clients instead of accepting timestamp-based writes; no automatic production migration runs from a normal git push

### Separate user accounts

`AUTH_TOKEN` signs sessions and serves as the `personal` password only when `AUTH_USERS` is absent. To enable separate accounts, hash each password using stdin and store a JSON object in the Pages secret `AUTH_USERS`

```bash
node scripts/password-hash.mjs
```

Enter the password on stdin and finish input with EOF; the command returns `{"salt":"…","hash":"…"}`. Set `AUTH_USERS` to an object such as `{"alice":{"salt":"…","hash":"…"}}`; use the `personal` username for the owner of migrated data if needed

Passwords use PBKDF2-SHA256; sign-in is limited to ten attempts per IP / username in fifteen minutes. Usernames select isolated server records and local databases; changing `AUTH_TOKEN` invalidates all sessions

### Backups and recovery

Settings offers a complete JSON backup of calendars, events, tasks, recurrence exclusions and preferences. Restore validates the file before writing and asks before replacing local data; restored changes synchronize with the current account

ICS is an interchange format, not a full application backup. Imported components preserve recurrence rules, exceptions and timezone definitions; unsupported RANGE exceptions or missing timezone definitions produce a visible error

`npm run backup:d1` exports D1 to ignored `backups/` and restores the dump in an in-memory SQLite database to check integrity and journal revisions. The scheduled workflow runs weekly and keeps artifacts for thirty days; add repository secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `BACKUP_ENCRYPTION_KEY` to enable it. Scheduled artifacts are encrypted with AES-256-GCM; the encryption key is a base64-encoded random 32-byte value and must be stored separately from the artifacts

Decrypt scheduled exports with `node scripts/encrypt-backup.mjs decrypt backup.sql.enc backup.sql` using the original `BACKUP_ENCRYPTION_KEY` environment variable

Before production recovery, download and verify the export with `npm run check:backup -- path/to/backup.sql`, restore to a separate D1 database and verify the account data there. Point a maintenance deployment at the recovered database only after verification; keep the original database and journal until recovery is confirmed

Tombstones and journal entries are retained so an old offline device cannot silently resurrect deleted data; backups may contain private calendar information and should have restricted access

---

## Desktop app (Tauri)

Use the HTTPS URL of your deployed API on the sign-in screen, for example `https://calendar.example.com/api`; the packaged application does not bundle a sync server

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
├── data/                 - backup, restore, imports, deletion queue and conflict resolution
├── sync/                 - client sessions, revisions and paginated synchronization
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

- Notifications require the tab or desktop app to be running and permission must be enabled in Settings
- Imported rules are preserved; the simple recurrence editor does not edit advanced imported RRULE clauses
- ICS RANGE exceptions and events with missing timezone definitions are rejected with an error rather than simplified
- Native drag handles on clipped continuation segments are disabled; edit a multiday event in its form or move its starting segment
- The journal and tombstones grow over time; retention requires a coordinated resnapshot protocol before pruning
- An already opened account remains editable offline until its locally remembered session expires; server access always requires a valid signed session

---

## Contributing

Issues and pull requests are welcome. If you have a feature idea or run into a bug, open an issue first so we can agree on the approach before you write code

---

## License

MIT © [Dmytro Filiurskyi](https://github.com/jarryuser)
