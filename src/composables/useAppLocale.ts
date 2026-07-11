import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { toIntlLocale, type LocaleCode } from '../i18n'

/** t() + aktuálny locale ako BCP-47 tag pre Intl.* volania (formatDate/timeAgo). */
export function useAppLocale() {
  const { t, locale } = useI18n()
  const intlLocale = computed(() => toIntlLocale(locale.value as LocaleCode))
  return { t, locale, intlLocale }
}
