<div align="center">

# Calendar

**Відкритий персональний календар з повною офлайн-підтримкою - вигляди місяця, тижня, дня, списку та року, повторювані події, введення природною мовою, дві дизайн-теми та нативний десктопний додаток. Без облікових записів, телеметрії та сервера**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tauri](https://img.shields.io/badge/Tauri-v2-24C8DB?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[English](README.md) · **Українська** · [Slovenčina](README.sk.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

</div>

---

## Огляд

Calendar - це повністю клієнтський веб-додаток, що зберігає все в IndexedDB браузера. Немає бекенду, автентифікації та мережевих запитів після завантаження сторінки. Ваші події ніколи не покидають ваш пристрій, якщо ви самі їх не експортуєте

Інтерфейс побудований за зразком Google Calendar і Fantastical - навігація з клавіатури, часова сітка для вигляду тижня/дня, аналіз природної мови в рядку пошуку, редагування повторюваних подій з винятками для окремих екземплярів, перетягування для перепланування

---

## Завантаження

Готові збірки публікуються автоматично з кожним релізом через GitHub Actions:

| Платформа | Файл |
|---|---|
| macOS (Apple Silicon M1/M2/M3) | `Calendar_*_aarch64.dmg` |
| macOS (Intel) | `Calendar_*_x64.dmg` |
| Windows | `Calendar_*_x64-setup.exe` |
| Linux (AppImage) | `Calendar_*_amd64.AppImage` |
| Linux (.deb) | `Calendar_*_amd64.deb` |

→ **[Останній реліз](../../releases/latest)**

---

## Можливості

| | Функція | Деталі |
|---|---|---|
| 📅 | **П'ять вигладів** | Місяць, тиждень, день, список, рік - переключення однією клавішею |
| ✏️ | **Редактор подій** | Назва, дата/час, весь день, місце, опис, колір, календар, нагадування |
| 🔁 | **Повторювані події** | Щодня, щотижня, щомісяця, щороку; редагування окремого/всіх |
| 🎨 | **Колір кожної події** | 9 кольорів незалежно від кольору календаря |
| 📚 | **Кілька календарів** | Будь-яка кількість, перемикання видимості, основний календар |
| ☑️ | **Завдання** | Список у сайдбарі з датами виконання, нотатками та відміткою завершення |
| 🔍 | **Миттєвий пошук** | Повнотекстовий пошук по назві, опису та місцю |
| 💬 | **Природна мова** | Введіть "Нарада завтра о 15:00" і натисніть Enter |
| 📤 | **iCal імпорт / експорт** | Імпорт `.ics` з будь-якого календарного додатку |
| 🔔 | **Нагадування** | Браузерні сповіщення за налаштований час до події |
| ⌨️ | **Гарячі клавіші** | Навігація та створення без миші |
| 🌍 | **Часові пояси** | Селектор IANA, всі часи відображаються в обраній зоні |
| 🌙 | **Темна / світла тема** | Незалежний перемикач, зберігається локально |
| 🎨 | **Дві дизайн-теми** | Editorial (тепла кремова + serif) і Fantastical (нейтральна, Apple-стиль) |
| 📱 | **Мобільний вигляд** | Висувний сайдбар, нижня навігація, свайп для переходу |
| 🖥️ | **Нативний додаток** | Tauri v2 - ~10 МБ, працює офлайн |
| 📵 | **100% офлайн** | IndexedDB - єдине сховище |

---

## Стек технологій

| Шар | Інструмент | Чому |
|---|---|---|
| Мова | TypeScript 5.5 | Типобезпека скрізь |
| UI | React 18 + Vite 5 | Швидкий HMR, плавні переходи |
| Стилі | Tailwind CSS v3 | Utility-first, CSS-змінні для токенів |
| Стан | Zustand | Мінімальний, selector-based |
| Сховище | Dexie.js (IndexedDB) | Типізований wrapper з транзакціями |
| Дати | date-fns + date-fns-tz | Tree-shakeable, підтримка часових поясів |
| Повторення | rrule | Повний RFC 5545 |
| NLP | chrono-node | Парсинг природної мови |
| iCal | ical.js | RFC 5545 імпорт/експорт |
| Drag & drop | @dnd-kit | Доступний drag-and-drop із live-прев'ю |
| Компоненти | Radix UI | Доступні примітиви без стилів |
| Іконки | lucide-react | Tree-shakeable набір |
| Десктоп | Tauri v2 | Системний WebView, ~10 МБ |
| i18n | react-i18next | 5 мов: EN, SK, UK, DE, RU |

---

## Початок роботи

```bash
git clone https://github.com/jarryuser/calendar.git
cd calendar
npm install
npm run dev        # → http://localhost:5173
```

Змінних середовища, API-ключів та додаткової конфігурації не потрібно

Збірка для продакшену:

```bash
npm run build      # виводить у dist/
npm run preview    # локальний перегляд збірки
```

Результат - статичний сайт: GitHub Pages, Netlify, Cloudflare Pages або nginx

---

## Десктопний додаток (Tauri)

Той самий код збирається як нативний додаток через [Tauri](https://tauri.app/) v2. Використовує системний WebView, тому бінарник ~10 МБ

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh   # Rust

# macOS
xcode-select --install

# Linux
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

npm run tauri:dev      # запуск з hot reload
npm run tauri:build    # виробнича збірка
```

Збірки: `src-tauri/target/release/bundle/`

| Платформа | Результат |
|---|---|
| macOS | `.app` + `.dmg` |
| Windows | `.exe` + `.msi` |
| Linux | `.AppImage` + `.deb` |

---

## Гарячі клавіші

| Клавіша | Дія |
|---|---|
| `n` | Нова подія |
| `j` | Наступний період |
| `k` | Попередній період |
| `t` | Перейти до сьогодні |
| `1` | Вигляд місяця |
| `2` | Вигляд тижня |
| `3` | Вигляд дня |
| `4` | Список |
| `5` | Рік |
| `/` | Фокус на пошук |
| `Esc` | Закрити / очистити пошук |

---

## Структура проєкту

```
src/
├── types/          - CalendarEvent, Calendar, Task, RecurrenceRule
├── db/             - Dexie-схема, seedDefaultCalendar()
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

## Як працюють повторювані події

Повторювані події зберігаються один раз як мастер-запис з полем `recurrence`. При завантаженні вигляду `expandRecurringEvents()` викликає `rrule.between(rangeStart, rangeEnd)` і матеріалізує видимі екземпляри в пам'яті - нічого не записується в базу

Редагування одного екземпляра створює запис-виняток з `recurringEventId`. Видалення записує tombstone до таблиці `deletedInstances`. Мастер-запис у жодному з цих випадків не змінюється

---

## Відомі обмеження

- **Сповіщення потребують відкритої вкладки або додатку** - Service Worker працює у фоні, але не коли браузер повністю закрито
- **iCal-імпорт ігнорує VTIMEZONE** - якщо файл використовує не-UTC час, відображення може відрізнятися
- **Немає синхронізації між пристроями** - IndexedDB прив'язаний до браузера/додатку
- **Розгортання RRULE в пам'яті** - дуже довгі серії можуть сповільнити завантаження широкого діапазону дат

---

## Участь у розробці

Питання та pull request вітаються. Якщо є ідея або знайшли баг - спочатку відкрийте issue

---

## Ліцензія

MIT © [Dmytro Filiurskyi](https://github.com/jarryuser)
