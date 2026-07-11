export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const ms = `${m}:${String(s).padStart(2, '0')}`
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : ms
}

export function formatDate(unixSeconds: number, locale: string): string {
  return new Date(unixSeconds * 1000).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

/** Relatívny čas cez Intl.RelativeTimeFormat — gramaticky správne skloňovanie
 * v akomkoľvek locale zadarmo, bez ručného prekladu "pred X minútami" pre
 * každý jazyk zvlášť. */
export function timeAgo(unixSeconds: number, locale: string): string {
  const diff = Date.now() / 1000 - unixSeconds
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' })

  if (diff < 3600) return rtf.format(-Math.max(1, Math.floor(diff / 60)), 'minute')
  if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), 'hour')
  if (diff < 30 * 86400) return rtf.format(-Math.floor(diff / 86400), 'day')
  const months = Math.floor(diff / (30 * 86400))
  return months < 12 ? rtf.format(-months, 'month') : rtf.format(-Math.floor(months / 12), 'year')
}

export const winratePct = (wins: number, games: number) =>
  games > 0 ? ((wins / games) * 100).toFixed(1) : '—'
