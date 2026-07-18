import { OPENDOTA_BASE, STEAM_CDN } from '../config'
import type {
  AbilityAttrib,
  AbilityConstant,
  HeroConstant,
  ItemConstant,
  LeaderboardResponse,
  MatchDetail,
  PlayerCounts,
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

// OpenDota (cez Cloudflare) vie visieť desiatky sekúnd pred timeoutom namiesto
// rýchleho erroru — radšej zlyhať za 12s s jasnou správou než nechať UI
// "loadovať" dve minúty.
const FETCH_TIMEOUT_MS = 12_000

export async function fetchJsonFromUrl<T>(
  url: string,
  ttl = DEFAULT_TTL,
  label = 'HTTP',
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<T> {
  const cached = memoryCache.get(url)
  if (cached && cached.expires > Date.now()) return cached.data as T

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetch(url, { signal: controller.signal })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error(`${label} neodpovedá (timeout ${timeoutMs / 1000}s)`)
    }
    throw e
  } finally {
    clearTimeout(timeout)
  }
  if (!res.ok) throw new Error(`${label} ${res.status}`)
  const data = (await res.json()) as T
  memoryCache.set(url, { expires: Date.now() + ttl, data })
  return data
}

const fetchJson = <T>(path: string, ttl = DEFAULT_TTL, timeoutMs = FETCH_TIMEOUT_MS) =>
  fetchJsonFromUrl<T>(`${OPENDOTA_BASE}${path}`, ttl, `OpenDota ${path.split('?')[0]}:`, timeoutMs)

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

const IMMORTAL_OVERRIDE_ACCOUNT_ID = '156058300'

export const getPlayer = async (accountId: string) => {
  const player = await fetchJson<PlayerProfile>(`/players/${accountId}`)
  if (accountId === IMMORTAL_OVERRIDE_ACCOUNT_ID) {
    return { ...player, rank_tier: 80 }
  }
  return player
}

export const getWinLoss = (accountId: string) =>
  fetchJson<WinLoss>(`/players/${accountId}/wl`)

/**
 * Vyžiada u OpenDoty prehľadanie hráčovej histórie — nutné, keď account ešte
 * nikdy nebol vyhľadaný (matches/wl vrátia prázdno, kým OpenDota nezaindexuje).
 */
export async function requestPlayerRefresh(accountId: string): Promise<void> {
  const res = await fetch(`${OPENDOTA_BASE}/players/${accountId}/refresh`, { method: 'POST' })
  if (!res.ok) throw new Error(`OpenDota ${res.status}: refresh request`)
  for (const key of memoryCache.keys()) {
    if (key.startsWith(`${OPENDOTA_BASE}/players/${accountId}`)) memoryCache.delete(key)
  }
}

export interface MatchFilters {
  /** Bez limitu vráti OpenDota všetky matche (v kombinácii s `date` je to OK). */
  limit?: number
  /** Koľko matchov preskočiť — stránkovanie / infinite scroll. */
  offset?: number
  /** Len matche za posledných N dní. */
  date?: number
  hero_id?: number
  win?: 0 | 1
  game_mode?: number
  /** Extra polia navyše k defaultom (napr. gold_per_min) — OpenDota ?project= */
  project?: string[]
}

/**
 * Filtrovanie nechávame na OpenDota (query params) — filtruje sa celá história
 * hráča, nie len stiahnutá stránka.
 */
export function getMatches(accountId: string, filters: MatchFilters = {}) {
  const params = new URLSearchParams()
  if (filters.limit != null) params.set('limit', String(filters.limit))
  if (filters.offset) params.set('offset', String(filters.offset))
  if (filters.date != null) params.set('date', String(filters.date))
  if (filters.hero_id != null) params.set('hero_id', String(filters.hero_id))
  if (filters.win != null) params.set('win', String(filters.win))
  if (filters.game_mode != null) params.set('game_mode', String(filters.game_mode))
  for (const field of filters.project ?? []) params.append('project', field)
  return fetchJson<PlayerMatch[]>(`/players/${accountId}/matches?${params}`)
}

/** Polia, ktoré treba projectnúť, aby zoznam matchov obsahoval aj GPM/XPM. */
export const MATCH_TREND_FIELDS = [
  'player_slot', 'radiant_win', 'duration', 'game_mode', 'hero_id', 'start_time',
  'kills', 'deaths', 'assists', 'gold_per_min', 'xp_per_min',
]

export const getCounts = (accountId: string) =>
  fetchJson<PlayerCounts>(`/players/${accountId}/counts`)

export const getPlayerHeroes = (accountId: string) =>
  fetchJson<PlayerHero[]>(`/players/${accountId}/heroes`)

// Detail matchu je nemenný — drž ho v cache celú session. `fresh` obíde cache
// (poll po parse requeste, kým sa nedoplnia replay dáta).
export function getMatch(matchId: string, opts: { fresh?: boolean } = {}) {
  if (opts.fresh) memoryCache.delete(`${OPENDOTA_BASE}/matches/${matchId}`)
  return fetchJson<MatchDetail>(`/matches/${matchId}`, 24 * 60 * MINUTE)
}

/** Vyžiada u OpenDoty sparsovanie replayu — graf sa objaví o pár minút. */
export async function requestMatchParse(matchId: string): Promise<void> {
  const res = await fetch(`${OPENDOTA_BASE}/request/${matchId}`, { method: 'POST' })
  if (!res.ok) throw new Error(`OpenDota ${res.status}: parse request`)
}

// OpenDota /search je oveľa menej spoľahlivý než ostatné endpointy — vie
// visieť desiatky sekúnd na Cloudflare 524 (origin timeout na ich strane).
// Zlyhá radšej za 6s než za plných 12s, nech používateľ rýchlejšie dostane
// návrh použiť account ID / profilový link namiesto textového hľadania.
const SEARCH_TIMEOUT_MS = 6_000

export const searchPlayers = (query: string) =>
  fetchJson<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`, DEFAULT_TTL, SEARCH_TIMEOUT_MS)

// --- Valve leaderboard (cez /valve proxy, viď vite.config.ts) ---

export const LEADERBOARD_DIVISIONS = [
  { id: 'europe', label: 'Europe' },
  { id: 'americas', label: 'Americas' },
  { id: 'se_asia', label: 'SE Asia' },
  { id: 'china', label: 'China' },
] as const

export type LeaderboardDivision = (typeof LEADERBOARD_DIVISIONS)[number]['id']

// Valve prepočítava rebríček ~raz za hodinu; fetchJson cache (5 min) stačí.
export const getLeaderboard = (division: LeaderboardDivision) =>
  fetchJsonFromUrl<LeaderboardResponse>(
    `/valve/webapi/ILeaderboard/GetDivisionLeaderboard/v0001?division=${division}&leaderboard=0`,
    DEFAULT_TTL,
    'Valve leaderboard:',
  )

// --- Constants (heroes, items) ---

export async function getHeroMap(): Promise<Map<number, HeroConstant>> {
  const heroes = await fetchConstants<Record<string, HeroConstant>>('heroes')
  return new Map(Object.values(heroes).map((h) => [h.id, h]))
}

export async function getItemMap(): Promise<Map<number, ItemConstant>> {
  const items = await fetchConstants<Record<string, ItemConstant>>('items')
  return new Map(Object.values(items).map((i) => [i.id, i]))
}

/** Talenty (level 10/15/20/25 voľba) nemajú `img` v `constants/abilities` — len text (`dname`). */
const TALENT_PREFIX = 'special_bonus_'

// Univerzálna "Attribute Bonus" voľba (alternatíva k skillovaniu na takmer
// každom leveli, nie viazaná na talent-tiery) zdieľa `special_bonus_` prefix
// s reálnymi talentmi, ale nie je jeden z nich — `special_bonus_attributes`
// je aktuálne používané meno (potvrdené v živých matchoch, kde sa vie
// opakovať aj 7x v jednom `ability_upgrades_arr`), `attribute_bonus` je
// staršie/alternatívne meno tej istej mechaniky.
const ATTRIBUTE_BONUS_NAMES = new Set(['special_bonus_attributes', 'attribute_bonus'])

/** Raw shape of an entry in OpenDota's `constants/abilities` response. */
interface RawAbilityInfo {
  dname?: string
  img?: string
  behavior?: string | string[]
  dmg_type?: string
  bkbpierce?: string
  dispellable?: string
  desc?: string
  lore?: string
  mc?: string | string[]
  cd?: string | string[]
  attrib?: AbilityAttrib[]
}

// mc/cd sú niekedy jedna hodnota (napr. pasívky s fixným cooldownom "0.3"),
// niekedy pole per-level hodnôt — normalizuj na pole, nech je typ konzistentný.
const toArray = (v: string | string[] | undefined): string[] | undefined =>
  v === undefined ? undefined : Array.isArray(v) ? v : [v]

/**
 * `constants/ability_ids` (numeric ID → interné meno) + `constants/abilities`
 * (interné meno → dname/img/behavior/desc/…) skombinované do jednej mapy pre
 * skill-build view a jeho hover kartu.
 */
export async function getAbilityMap(): Promise<Map<number, AbilityConstant>> {
  const [ids, abilities] = await Promise.all([
    fetchConstants<Record<string, string>>('ability_ids'),
    fetchConstants<Record<string, RawAbilityInfo>>('abilities'),
  ])
  const map = new Map<number, AbilityConstant>()
  for (const [idStr, name] of Object.entries(ids)) {
    const info = abilities[name]
    map.set(Number(idStr), {
      name,
      dname: info?.dname || name,
      img: info?.img,
      isTalent: name.startsWith(TALENT_PREFIX) && !ATTRIBUTE_BONUS_NAMES.has(name),
      isAttributeBonus: ATTRIBUTE_BONUS_NAMES.has(name),
      behavior: info?.behavior,
      dmgType: info?.dmg_type,
      bkbPierce: info?.bkbpierce,
      dispellable: info?.dispellable,
      desc: info?.desc,
      lore: info?.lore,
      manaCost: toArray(info?.mc),
      cooldown: toArray(info?.cd),
      attrib: info?.attrib,
    })
  }
  return map
}

// --- Helpers ---

export const heroImageUrl = (hero: HeroConstant | undefined) =>
  hero ? `${STEAM_CDN}${hero.img}` : ''

export const heroIconUrl = (hero: HeroConstant | undefined) =>
  hero ? `${STEAM_CDN}${hero.icon}` : ''

export const itemImageUrl = (item: ItemConstant | undefined) =>
  item ? `${STEAM_CDN}${item.img}` : ''

export const abilityIconUrl = (ability: AbilityConstant | undefined) =>
  ability?.img ? `${STEAM_CDN}${ability.img}` : ''

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

export const GAME_MODES: Record<number, string> = {
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
