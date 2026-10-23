<div align="center">

# Calendar

**Osobný kalendár s miestnym úložiskom, overenou synchronizáciou, úlohami, zálohami a desktopovou aplikáciou**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tauri](https://img.shields.io/badge/Tauri-v2-24C8DB?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[English](README.md) · [Українська](README.uk.md) · **Slovenčina** · [Deutsch](README.de.md) · [Русский](README.ru.md)

</div>

---

## Prehľad

Calendar uchováva miestnu kópiu v IndexedDB a po prihlásení ju synchronizuje s Cloudflare Pages Functions a D1. Servery a používatelia majú oddelené databázy; prihlásenie vyžaduje server a relácia platí osem hodín

Rozhranie je inšpirované Google Calendar a Fantastical - navigácia pomocou klávesnice, časová mriežka pre zobrazenia týždeň/deň, analýza prirodzeného jazyka vo vyhľadávacom poli, úprava opakujúcich sa udalostí s výnimkami a drag-and-drop pre preplánování

---

## Stiahnutie

Hotové binárky sú automaticky zverejňované s každým vydaním cez GitHub Actions:

| Platforma | Súbor |
|---|---|
| macOS (Apple Silicon M1/M2/M3) | `Calendar_*_aarch64.dmg` |
| macOS (Intel) | `Calendar_*_x64.dmg` |
| Windows | `Calendar_*_x64-setup.exe` |
| Linux (AppImage) | `Calendar_*_amd64.AppImage` |
| Linux (.deb) | `Calendar_*_amd64.deb` |

→ **[Najnovšie vydanie](../../releases/latest)**

---

## Funkcie

| | Funkcia | Podrobnosti |
|---|---|---|
| 📅 | **Päť zobrazení** | Mesiac, týždeň, deň, agenda, rok - prepínanie jednou klávesou |
| ✏️ | **Rozšírený editor udalostí** | Názov, dátum/čas, celý deň, miesto, popis, farba, kalendár, pripomienky |
| 🔁 | **Opakujúce sa udalosti** | Denne, týždenne, mesačne, ročne; úprava tejto / tejto a nasledujúcich / všetkých |
| 🎨 | **Farba každej udalosti** | 9 farieb nezávisle od farby kalendára |
| 📚 | **Viacero kalendárov** | Ľubovoľný počet, prepínanie viditeľnosti, predvolený kalendár |
| ☑️ | **Úlohy** | Zoznam s dátumami splnenia, poznámkami a prepínačom dokončenia |
| 🔍 | **Okamžité vyhľadávanie** | Fulltextové vyhľadávanie v názve, popise a mieste |
| 💬 | **Prirodzený jazyk** | Zadajte „Stretnutie zajtra o 15:00" a stlačte Enter |
| 📤 | **iCal import / export** | Import `.ics` súborov a export udalostí |
| 🔔 | **Pripomienky** | Upozornenia prehliadača v nastavenom čase pred udalosťou |
| ⌨️ | **Klávesové skratky** | Navigácia a vytváranie bez myši |
| 🌍 | **Časové pásma** | IANA selektor, všetky časy vo zvolenom pásme |
| 🌙 | **Tmavá / svetlá téma** | Nezávislý prepínač, ukladá sa lokálne |
| 🎨 | **Dve dizajnové témy** | Editorial (teplý krém + serif) a Fantastical (neutrálny, Apple štýl) |
| 📱 | **Mobilné rozhranie** | Vysúvací sidebar, dolná navigácia, gestá potiahnutím |
| 🖥️ | **Natívna desktopová aplikácia** | Tauri v2 - ~10 MB, pracuje offline |

---

## Technologický stack

| Vrstva | Nástroj | Prečo |
|---|---|---|
| Jazyk | TypeScript 5.5 | Typová bezpečnosť všade |
| UI | React 18 + Vite 5 | Rýchly HMR, plynulé prechody |
| Štýlovanie | Tailwind CSS v3 | Utility-first, CSS premenné pre tokeny |
| Stav | Zustand | Minimálny, selektor-based |
| Úložisko | Dexie.js (IndexedDB) | Typizovaný wrapper s transakciami |
| Dátumy | date-fns + date-fns-tz | Tree-shakeable, podpora časových pásiem |
| Opakovanie | rrule | Plný RFC 5545 |
| NLP | chrono-node | Parsovanie prirodzeného jazyka |
| iCal | ical.js | RFC 5545 import/export |
| Drag & Drop | @dnd-kit | Prístupný DnD s live náhľadom |
| Komponenty | Radix UI | Prístupné primitívy bez štýlov |
| Ikony | lucide-react | Tree-shakeable sada ikon |
| Desktop | Tauri v2 | Systémový WebView, ~10 MB |
| i18n | react-i18next | 5 jazykov: EN, SK, UK, DE, RU |

---

## Začíname

Aktuálny návod pre server, migráciu, používateľov a zálohy: [príručka](README.md#getting-started)

```bash
npm ci
npm run db:migrate:local
npm run dev
# In a second terminal with .dev.vars configured
npm run pages:dev
```

---

## Desktopová aplikácia (Tauri)

Rovnaký kód sa balí ako natívna desktopová aplikácia cez [Tauri](https://tauri.app/) v2. Výsledok je ~10 MB

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh   # Rust

# macOS
xcode-select --install

# Linux
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

npm run tauri:dev      # spustenie s hot reload
npm run tauri:build    # produkčný build
```

Výstup buildu: `src-tauri/target/release/bundle/`

| Platforma | Výstup |
|---|---|
| macOS | `.app` + `.dmg` |
| Windows | `.exe` + `.msi` |
| Linux | `.AppImage` + `.deb` |

---

## Klávesové skratky

| Kláves | Akcia |
|---|---|
| `n` | Nová udalosť |
| `j` | Nasledujúce obdobie |
| `k` | Predchádzajúce obdobie |
| `t` | Prejsť na dnešok |
| `1` | Zobrazenie mesiaca |
| `2` | Zobrazenie týždňa |
| `3` | Zobrazenie dňa |
| `4` | Agenda |
| `5` | Rok |
| `/` | Fokus na vyhľadávanie |
| `Esc` | Zatvoriť dialóg / vymazať vyhľadávanie |

---

## Štruktúra projektu

```
src/
├── types/          - CalendarEvent, Calendar, Task, RecurrenceRule
├── db/             - Dexie schéma, seedDefaultCalendar()
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

## Známe obmedzenia

Obmedzenia: upozornenia vyžadujú otvorenú aplikáciu; zložité importované pravidlá sa zachovajú, ale jednoduchý editor ich neupravuje; nepodporované ICS RANGE výnimky sa odmietnu s chybou

---

## Prispievanie

Otázky a pull requesty sú vítané. Pri nápade na funkciu alebo chybe najprv otvorte issue

---

## Licencia

MIT © [Dmytro Filiurskyi](https://github.com/jarryuser)
