import { fetchJsonFromUrl } from './opendota'
import type { SteamNewsItem, SteamNewsResponse } from '../types/steamNews'

const DOTA_APPID = 570
// Proxied via /steamnews (see vite.config.ts dev proxy + vercel.json rewrite)
// — the Steam Web API doesn't send CORS headers for direct browser fetches.
const STEAM_NEWS_BASE = '/steamnews/ISteamNews/GetNewsForApp/v2'

// Valve posts patches/news sporadically — no need to refetch on every page load.
const NEWS_TTL = 30 * 60_000

export async function getDotaNews(count = 10): Promise<SteamNewsItem[]> {
  const params = new URLSearchParams({
    appid: String(DOTA_APPID),
    count: String(count),
    maxlength: '600',
    format: 'json',
  })
  const res = await fetchJsonFromUrl<SteamNewsResponse>(
    `${STEAM_NEWS_BASE}?${params}`,
    NEWS_TTL,
    'Steam news:',
  )
  return res.appnews.newsitems
}
