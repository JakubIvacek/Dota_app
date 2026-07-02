import { OPENDOTA_BASE, STEAM_CDN } from '../config'
import type {
  HeroConstant,
  ItemConstant,
  MatchDetail,
  PlayerHero,
  PlayerMatch,
  PlayerProfile,
  SearchResult,
  WinLoss,
} from '../types/opendota'

/**
 * Jednoduchá in-memory cache s TTL — šetrí OpenDota rate limit (~60 req/min)
 * pri preklikávaní medzi obrazovkami. Konštanty (heroes/items) navyše
 * persistujeme do localStorage, menia sa len pri patchoch.
 */
const memoryCache = new Map<string, { expires: number; data: unknown }>()

const MINUTE = 60_000
const DEFAULT_TTL = 5 * MINUTE
const CONSTANTS_TTL = 24 * 60 * MINUTE

async function fetchJson<T>(path: string, ttl = DEFAULT_TTL): Promise<T> {
  const url = `${OPENDOTA_BASE}${path}`
  const cached = memoryCache.get(url)
  if (cached && cached.expires > Date.now()) return cached.data as T

  const res = await fetch(url)
  if (!res.ok) throw new Error(`OpenDota ${res.status}: ${path}`)
  const data = (await res.json()) as T
  memoryCache.set(url, { expires: Date.now() + ttl, data })
  return data
}

async function fetchConstants<T>(resource: string): Promise<T> {
  const key = `opendota:constants:${resource}`
  const stored = localStorage.getItem(key)
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as { expires: number; data: T }
      if (parsed.expires > Date.now()) return parsed.data
    } catch {
      localStorage.removeItem(key)
    }
  }
  const data = await fetchJson<T>(`/constants/${resource}`, CONSTANTS_TTL)
  localStorage.setItem(key, JSON.stringify({ expires: Date.now() + CONSTANTS_TTL, data }))
  return data
}

// --- Player endpoints ---

export const getPlayer = (accountId: string) =>
  fetchJson<PlayerProfile>(`/players/${accountId}`)

export const getWinLoss = (accountId: string) =>
  fetchJson<WinLoss>(`/players/${accountId}/wl`)

export const getMatches = (accountId: string, limit = 50) =>
  fetchJson<PlayerMatch[]>(`/players/${accountId}/matches?limit=${limit}`)

export const getPlayerHeroes = (accountId: string) =>
  fetchJson<PlayerHero[]>(`/players/${accountId}/heroes`)

// Detail matchu je nemenný — drž ho v cache celú session.
export const getMatch = (matchId: string) =>
  fetchJson<MatchDetail>(`/matches/${matchId}`, 24 * 60 * MINUTE)

export const searchPlayers = (query: string) =>
  fetchJson<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`)

// --- Constants (heroes, items) ---

export async function getHeroMap(): Promise<Map<number, HeroConstant>> {
  const heroes = await fetchConstants<Record<string, HeroConstant>>('heroes')
  return new Map(Object.values(heroes).map((h) => [h.id, h]))
}

export async function getItemMap(): Promise<Map<number, ItemConstant>> {
  const items = await fetchConstants<Record<string, ItemConstant>>('items')
  return new Map(Object.values(items).map((i) => [i.id, i]))
}

// --- Helpers ---

export const heroImageUrl = (hero: HeroConstant | undefined) =>
  hero ? `${STEAM_CDN}${hero.img}` : ''

export const heroIconUrl = (hero: HeroConstant | undefined) =>
  hero ? `${STEAM_CDN}${hero.icon}` : ''

export const itemImageUrl = (item: ItemConstant | undefined) =>
  item ? `${STEAM_CDN}${item.img}` : ''

export const isRadiantSlot = (playerSlot: number) => playerSlot < 128

export const wonMatch = (m: Pick<PlayerMatch, 'player_slot' | 'radiant_win'>) =>
  isRadiantSlot(m.player_slot) === m.radiant_win

const RANK_NAMES = [
  'Herald', 'Guardian', 'Crusader', 'Archon', 'Legend', 'Ancient', 'Divine', 'Immortal',
]

export function rankTierName(rankTier: number | null): string {
  if (!rankTier) return 'Uncalibrated'
  const medal = RANK_NAMES[Math.floor(rankTier / 10) - 1] ?? 'Unknown'
  const stars = rankTier % 10
  return medal === 'Immortal' || stars === 0 ? medal : `${medal} ${stars}`
}

const GAME_MODES: Record<number, string> = {
  1: 'All Pick',
  2: 'Captains Mode',
  3: 'Random Draft',
  4: 'Single Draft',
  5: 'All Random',
  16: 'Captains Draft',
  22: 'Ranked All Pick',
  23: 'Turbo',
}

export const gameModeName = (mode: number) => GAME_MODES[mode] ?? `Mode ${mode}`
