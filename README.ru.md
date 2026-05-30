<div align="center">

# Calendar

**Открытый личный календарь с полной офлайн-поддержкой - виды месяца, недели, дня, списка и года, повторяющиеся события, ввод на естественном языке, две дизайн-темы и нативное десктопное приложение. Без аккаунтов, телеметрии и сервера**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tauri](https://img.shields.io/badge/Tauri-v2-24C8DB?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[English](README.md) · [Українська](README.uk.md) · [Slovenčina](README.sk.md) · [Deutsch](README.de.md) · **Русский**

</div>

---

## Обзор

Calendar - полностью клиентское веб-приложение, хранящее всё в IndexedDB браузера. Нет бэкенда, аутентификации и сетевых запросов после загрузки страницы. Ваши события никогда не покидают устройство, если вы сами их не экспортируете

Интерфейс создан по образцу Google Calendar и Fantastical - навигация с клавиатуры, временна́я сетка для видов недели/дня, разбор естественного языка в строке поиска, редактирование повторяющихся событий с исключениями и перетаскивание для перепланирования

---

## Загрузка

Готовые сборки публикуются автоматически с каждым релизом через GitHub Actions:

| Платформа | Файл |
|---|---|
| macOS (Apple Silicon M1/M2/M3) | `Calendar_*_aarch64.dmg` |
| macOS (Intel) | `Calendar_*_x64.dmg` |
| Windows | `Calendar_*_x64-setup.exe` |
| Linux (AppImage) | `Calendar_*_amd64.AppImage` |
| Linux (.deb) | `Calendar_*_amd64.deb` |

→ **[Последний релиз](../../releases/latest)**

---

## Возможности

| | Функция | Подробности |
|---|---|---|
| 📅 | **Пять видов** | Месяц, неделя, день, список, год - переключение одной клавишей |
| ✏️ | **Расширенный редактор** | Название, дата/время, весь день, место, описание, цвет, календарь, напоминания |
| 🔁 | **Повторяющиеся события** | Ежедневно, еженедельно, ежемесячно, ежегодно; редактирование этого / этого и следующих / всех |
| 🎨 | **Цвет каждого события** | 9 цветов независимо от цвета календаря |
| 📚 | **Несколько календарей** | Любое количество, переключение видимости, основной календарь |
| ☑️ | **Задачи** | Список с датами выполнения, заметками и переключателем завершения |
| 🔍 | **Мгновенный поиск** | Полнотекстовый поиск по названию, описанию и месту |
| 💬 | **Естественный язык** | Введите «Встреча завтра в 15:00» и нажмите Enter |
| 📤 | **iCal импорт / экспорт** | Импорт `.ics` и экспорт событий |
| 🔔 | **Напоминания** | Браузерные уведомления за настраиваемое время до события |
| ⌨️ | **Горячие клавиши** | Навигация и создание без мыши |
| 🌍 | **Часовые пояса** | Селектор IANA, все времена в выбранном поясе |
| 🌙 | **Тёмная / светлая тема** | Независимый переключатель, сохраняется локально |
| 🎨 | **Две дизайн-темы** | Editorial (тёплый крем + serif) и Fantastical (нейтральная, Apple-стиль) |
| 📱 | **Мобильный вид** | Выезжающий sidebar, нижняя навигация, свайп для перехода |
| 🖥️ | **Нативное приложение** | Tauri v2 - ~10 МБ, работает офлайн |
| 📵 | **100% офлайн** | IndexedDB - единственное хранилище |

---

## Стек технологий

| Слой | Инструмент | Почему |
|---|---|---|
| Язык | TypeScript 5.5 | Типобезопасность везде |
| UI | React 18 + Vite 5 | Быстрый HMR, плавные переходы |
| Стили | Tailwind CSS v3 | Utility-first, CSS-переменные для токенов |
| Состояние | Zustand | Минимальный, selector-based |
| Хранилище | Dexie.js (IndexedDB) | Типизированный wrapper с транзакциями |
| Даты | date-fns + date-fns-tz | Tree-shakeable, поддержка часовых поясов |
| Повторения | rrule | Полный RFC 5545 |
| NLP | chrono-node | Парсинг естественного языка |
| iCal | ical.js | RFC 5545 импорт/экспорт |
| Drag & Drop | @dnd-kit | Доступный DnD с live-превью |
| Компоненты | Radix UI | Доступные примитивы без стилей |
| Иконки | lucide-react | Tree-shakeable набор |
| Десктоп | Tauri v2 | Системный WebView, ~10 МБ |
| i18n | react-i18next | 5 языков: EN, SK, UK, DE, RU |

---

## Быстрый старт

```bash
git clone https://github.com/jarryuser/calendar.git
cd calendar
npm install
npm run dev        # → http://localhost:5173
```

Переменные окружения, API-ключи и дополнительная конфигурация не нужны

Продакшн-сборка:

```bash
npm run build      # выводит в dist/
npm run preview    # локальный просмотр сборки
```

Результат - статический сайт: GitHub Pages, Netlify, Cloudflare Pages или nginx

---

## Десктопное приложение (Tauri)

Тот же код собирается как нативное десктопное приложение через [Tauri](https://tauri.app/) v2. Результат - ~10 МБ

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh   # Rust

# macOS
xcode-select --install

# Linux
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

npm run tauri:dev      # запуск с hot reload
npm run tauri:build    # релизная сборка
```

Артефакты: `src-tauri/target/release/bundle/`

| Платформа | Результат |
|---|---|
| macOS | `.app` + `.dmg` |
| Windows | `.exe` + `.msi` |
| Linux | `.AppImage` + `.deb` |

---

## Горячие клавиши

| Клавиша | Действие |
|---|---|
| `n` | Новое событие |
| `j` | Следующий период |
| `k` | Предыдущий период |
| `t` | Перейти к сегодня |
| `1` | Вид месяца |
| `2` | Вид недели |
| `3` | Вид дня |
| `4` | Список |
| `5` | Год |
| `/` | Фокус на поиск |
| `Esc` | Закрыть / очистить поиск |

---

## Структура проекта

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

## Известные ограничения

- **Уведомления требуют открытой вкладки или приложения** - Service Worker работает в фоне, но не когда браузер полностью закрыт
- **iCal-импорт игнорирует VTIMEZONE** - если исходный файл использует не-UTC время, отображение может отличаться
- **Нет синхронизации между устройствами** - IndexedDB привязан к браузеру/приложению
- **Разворачивание RRULE в памяти** - очень длинные серии могут замедлить загрузку широкого диапазона дат

---

## Участие в разработке

Вопросы и pull request приветствуются. При идее или баге сначала откройте issue

---

## Лицензия

MIT © [Dmytro Filiurskyi](https://github.com/jarryuser)
