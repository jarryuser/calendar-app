import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import sk from './locales/sk.json'
import uk from './locales/uk.json'
import de from './locales/de.json'
import ru from './locales/ru.json'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'sk', label: 'SK' },
  { code: 'uk', label: 'UK' },
  { code: 'de', label: 'DE' },
  { code: 'ru', label: 'RU' },
] as const

export type LangCode = typeof SUPPORTED_LANGUAGES[number]['code']

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, sk: { translation: sk }, uk: { translation: uk }, de: { translation: de }, ru: { translation: ru } },
    fallbackLng: 'en',
    supportedLngs: ['en', 'sk', 'uk', 'de', 'ru'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n
