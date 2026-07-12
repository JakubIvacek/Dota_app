/** Valve's news `contents` field mixes BBCode ([img], [url]...) and raw HTML —
 * strip both down to plain text so it can go through normal text
 * interpolation instead of `v-html` (avoids sanitizing untrusted markup). */
function stripMarkup(raw: string): string {
  return raw
    .replace(/\{STEAM_CLAN_[A-Z_]+\}[^\s]*/g, ' ')
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function newsExcerpt(raw: string, maxLen = 220): string {
  const text = stripMarkup(raw)
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen).replace(/\s+\S*$/, '')}…`
}
