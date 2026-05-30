<div align="center">

# Calendar

**Open-Source-Kalender mit vollständiger Offline-Unterstützung - Monats-, Wochen-, Tages-, Agenda- und Jahresansichten, Wiederholungstermine, Eingabe in natürlicher Sprache, zwei Designthemen und eine native Desktop-App. Keine Konten, keine Telemetrie, kein Server**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tauri](https://img.shields.io/badge/Tauri-v2-24C8DB?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[English](README.md) · [Українська](README.uk.md) · [Slovenčina](README.sk.md) · **Deutsch** · [Русский](README.ru.md)

</div>

---

## Übersicht

Calendar ist eine vollständig clientseitige Web-App, die alles in der IndexedDB des Browsers speichert. Es gibt kein Backend, keine Authentifizierung und keine Netzwerkanfragen nach dem Laden der Seite. Ihre Termine verlassen das Gerät nie, es sei denn, Sie exportieren sie ausdrücklich

Die Benutzeroberfläche ist an Google Calendar und Fantastical angelehnt - tastaturgesteuerte Navigation, Zeitraster für Wochen-/Tagesansichten, Parsing natürlicher Sprache in der Suchleiste, Bearbeitung von Wiederholungsterminen mit Ausnahmen und Drag-and-Drop zum Umplanen

---

## Download

Fertige Binärdateien werden automatisch mit jedem Release über GitHub Actions veröffentlicht:

| Plattform | Datei |
|---|---|
| macOS (Apple Silicon M1/M2/M3) | `Calendar_*_aarch64.dmg` |
| macOS (Intel) | `Calendar_*_x64.dmg` |
| Windows | `Calendar_*_x64-setup.exe` |
| Linux (AppImage) | `Calendar_*_amd64.AppImage` |
| Linux (.deb) | `Calendar_*_amd64.deb` |

→ **[Neueste Version](../../releases/latest)**

---

## Funktionen

| | Funktion | Details |
|---|---|---|
| 📅 | **Fünf Ansichten** | Monat, Woche, Tag, Agenda, Jahr - mit einer Taste wechseln |
| ✏️ | **Erweiterter Termineditor** | Titel, Datum/Uhrzeit, ganztägig, Ort, Beschreibung, Farbe, Kalender, Erinnerungen |
| 🔁 | **Wiederholungstermine** | Täglich, wöchentlich, monatlich, jährlich; diesen / diesen und folgende / alle bearbeiten |
| 🎨 | **Farbe pro Termin** | 9 Farben unabhängig von der Kalenderfarbe |
| 📚 | **Mehrere Kalender** | Beliebig viele, Sichtbarkeit umschalten, Standard festlegen |
| ☑️ | **Aufgaben** | Aufgabenliste mit Fälligkeitsdaten, Notizen und Erledigungs-Toggle |
| 🔍 | **Sofortsuche** | Volltextsuche über Titel, Beschreibung und Ort |
| 💬 | **Natürliche Sprache** | „Meeting morgen um 15 Uhr" eingeben und Enter drücken |
| 📤 | **iCal Import / Export** | `.ics`-Dateien importieren und exportieren |
| 🔔 | **Erinnerungen** | Browser-Benachrichtigungen zur konfigurierbaren Zeit vor dem Termin |
| ⌨️ | **Tastenkürzel** | Navigation und Erstellung ohne Maus |
| 🌍 | **Zeitzonen** | IANA-Selektor, alle Zeiten in der gewählten Zone |
| 🌙 | **Dunkel- / Hellmodus** | Unabhängiger Umschalter, wird lokal gespeichert |
| 🎨 | **Zwei Designthemen** | Editorial (warmes Creme + Serif) und Fantastical (neutral, Apple-Stil) |
| 📱 | **Mobiles Layout** | Einschiebbares Sidebar-Drawer, untere Navigationsleiste, Wisch-Gesten |
| 🖥️ | **Native Desktop-App** | Tauri v2 - ~10 MB, funktioniert offline |
| 📵 | **100% offline** | IndexedDB ist der einzige Speicher |

---

## Technologie-Stack

| Schicht | Werkzeug | Warum |
|---|---|---|
| Sprache | TypeScript 5.5 | Typsicherheit durchgehend |
| UI | React 18 + Vite 5 | Schnelles HMR, flüssige Übergänge |
| Styling | Tailwind CSS v3 | Utility-First, CSS-Variablen für Tokens |
| Zustand | Zustand | Minimal, selektor-basiert |
| Speicher | Dexie.js (IndexedDB) | Typisierter Wrapper mit Transaktionen |
| Datumsmathematik | date-fns + date-fns-tz | Tree-shakeable, zeitzonenbewusst |
| Wiederholung | rrule | Vollständiges RFC 5545 |
| NLP | chrono-node | Natürlichsprachliches Parsing |
| iCal | ical.js | RFC 5545 Import/Export |
| Drag & Drop | @dnd-kit | Zugängliches DnD mit Live-Vorschau |
| Komponenten | Radix UI | Zugängliche Primitive ohne Styling |
| Icons | lucide-react | Tree-shakeables Icon-Set |
| Desktop | Tauri v2 | System-WebView, ~10 MB |
| i18n | react-i18next | 5 Sprachen: EN, SK, UK, DE, RU |

---

## Erste Schritte

```bash
git clone https://github.com/jarryuser/calendar.git
cd calendar
npm install
npm run dev        # → http://localhost:5173
```

Keine Umgebungsvariablen, keine API-Schlüssel, keine weitere Konfiguration nötig

Produktions-Build:

```bash
npm run build      # gibt nach dist/ aus
npm run preview    # lokale Vorschau des Builds
```

Die Ausgabe ist eine statische Website: GitHub Pages, Netlify, Cloudflare Pages oder nginx

---

## Desktop-App (Tauri)

Derselbe Code wird als native Desktop-App über [Tauri](https://tauri.app/) v2 gebündelt. Das Ergebnis ist ~10 MB

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh   # Rust

# macOS
xcode-select --install

# Linux
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

npm run tauri:dev      # mit Hot Reload starten
npm run tauri:build    # Release-Build erstellen
```

Build-Ausgabe: `src-tauri/target/release/bundle/`

| Plattform | Ausgabe |
|---|---|
| macOS | `.app` + `.dmg` |
| Windows | `.exe` + `.msi` |
| Linux | `.AppImage` + `.deb` |

---

## Tastenkürzel

| Taste | Aktion |
|---|---|
| `n` | Neuer Termin |
| `j` | Nächste Periode |
| `k` | Vorherige Periode |
| `t` | Zu heute wechseln |
| `1` | Monatsansicht |
| `2` | Wochenansicht |
| `3` | Tagesansicht |
| `4` | Agenda |
| `5` | Jahresansicht |
| `/` | Suche fokussieren |
| `Esc` | Dialog schließen / Suche leeren |

---

## Projektstruktur

```
src/
├── types/          - CalendarEvent, Calendar, Task, RecurrenceRule
├── db/             - Dexie-Schema, seedDefaultCalendar()
├── store/          - uiStore, calendarStore, eventStore, taskStore
├── utils/          - recurrence, ical, nlp, timezone, dates, colors
├── hooks/          - keyboard, notifications, theme, swipe, mobile
└── components/
    ├── layout/     - AppLayout, Header, BottomNav
    ├── sidebar/    - MiniCalendar, CalendarList, TaskList
    ├── views/      - MonthView, WeekView, DayView, AgendaView, YearView
    ├── event/      - EventModal, EventPopover, RecurrenceEditor
    ├── task/       - TaskModal
    └── ui/         - Button, Dialog, Popover, Toast, DropdownMenu
```

---

## Bekannte Einschränkungen

- **Benachrichtigungen erfordern einen offenen Tab oder die App** - der Service Worker funktioniert im Hintergrund, aber nicht wenn der Browser vollständig geschlossen ist
- **iCal-Import ignoriert VTIMEZONE** - wenn die Quelldatei Nicht-UTC-Zeiten verwendet, kann die Anzeige abweichen
- **Keine geräteübergreifende Synchronisation** - IndexedDB ist pro Browser/App gebunden
- **RRULE-Erweiterung erfolgt im Arbeitsspeicher** - sehr lange Wiederholungsserien können das Laden eines breiten Datumsbereichs verlangsamen

---

## Mitwirken

Issues und Pull Requests sind willkommen. Bei einer Feature-Idee oder einem Bug bitte zuerst ein Issue öffnen

---

## Lizenz

MIT © [Dmytro Filiurskyi](https://github.com/jarryuser)
