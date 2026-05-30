import { useTranslation } from 'react-i18next'
import { enUS, sk, uk, de, ru } from 'date-fns/locale'
import type { Locale } from 'date-fns'

const LOCALES: Record<string, Locale> = { en: enUS, sk, uk, de, ru }

export function useDateLocale(): Locale {
  const { i18n } = useTranslation()
  return LOCALES[i18n.language] ?? enUS
}
