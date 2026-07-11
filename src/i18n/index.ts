import { createI18n } from 'vue-i18n'
import en from './locales/en'
import sk from './locales/sk'
import ru from './locales/ru'
import uk from './locales/uk'
import de from './locales/de'
import pt from './locales/pt'
import es from './locales/es'
import zh from './locales/zh'
import fil from './locales/fil'
import tr from './locales/tr'
import { noPluralRule, slavicEastPluralRule, slovakPluralRule } from './pluralRules'

export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'sk', label: 'Slovenčina' },
  { code: 'ru', label: 'Русский' },
  { code: 'uk', label: 'Українська' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português (BR)' },
  { code: 'es', label: 'Español (LatAm)' },
  { code: 'zh', label: '简体中文' },
  { code: 'fil', label: 'Filipino' },
  { code: 'tr', label: 'Türkçe' },
] as const

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]['code']

/** Naše locale kódy → BCP-47 pre Intl.DateTimeFormat/RelativeTimeFormat. */
const BCP47: Record<LocaleCode, string> = {
  en: 'en-US',
  sk: 'sk-SK',
  ru: 'ru-RU',
  uk: 'uk-UA',
  de: 'de-DE',
  pt: 'pt-BR',
  es: 'es-419',
  zh: 'zh-Hans',
  fil: 'fil-PH',
  tr: 'tr-TR',
}

export const toIntlLocale = (code: LocaleCode): string => BCP47[code]

const LOCALE_KEY = 'dotastats:locale'
const DEFAULT_LOCALE: LocaleCode = 'en'

function isSupportedLocale(value: string | null): value is LocaleCode {
  return SUPPORTED_LOCALES.some((l) => l.code === value)
}

function loadPersistedLocale(): LocaleCode {
  try {
    const stored = localStorage.getItem(LOCALE_KEY)
    return isSupportedLocale(stored) ? stored : DEFAULT_LOCALE
  } catch {
    return DEFAULT_LOCALE
  }
}

export function persistLocale(code: LocaleCode) {
  try {
    localStorage.setItem(LOCALE_KEY, code)
  } catch {
    // localStorage nedostupný (private mode ai pod.) — v poriadku, len sa nezapamätá.
  }
}

export const i18n = createI18n({
  legacy: false,
  locale: loadPersistedLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: { en, sk, ru, uk, de, pt, es, zh, fil, tr },
  pluralRules: {
    ru: slavicEastPluralRule,
    uk: slavicEastPluralRule,
    sk: slovakPluralRule,
    zh: noPluralRule,
    fil: noPluralRule,
    tr: noPluralRule,
  },
})
