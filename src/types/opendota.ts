export interface PlayerProfile {
  profile: {
    account_id: number
    personaname: string
    avatarfull: string
    steamid?: string
  } | null
  rank_tier: number | null
  leaderboard_rank: number | null
}

export interface SearchResult {
  account_id: number
  personaname: string
  avatarfull: string
  last_match_time?: string
}

/** Subset of OpenDota's /proPlayers fields — only what the suggested-players
 * card on the home page needs. `name` is the curated pro handle (e.g.
 * "Yatoro"), distinct from `personaname` which is the player's current,
 * freely-editable Steam display name (often a joke status, not their handle). */
export interface ProPlayer {
  account_id: number
  personaname: string
  avatarfull: string
  name: string | null
  team_id: number | null
  team_name: string | null
  last_match_time: string | null
}

/** Subset of OpenDota's /teams fields — pre-sorted by `rating` descending. */
export interface Team {
  team_id: number
  name: string
  rating: number
}

export interface WinLoss {
  win: number
  lose: number
}

export interface PlayerMatch {
  match_id: number
  player_slot: number
  radiant_win: boolean
  duration: number
  game_mode: number
  lobby_type: number
  hero_id: number
  start_time: number
  kills: number
  deaths: number
  assists: number
  /** Len ak sa vyžiadajú cez ?project= */
  gold_per_min?: number
  xp_per_min?: number
}

export interface CountBucket {
  games: number
  win: number
}

/** GET /players/{id}/counts — all-time počty podľa kategórií. */
export interface PlayerCounts {
  game_mode: Record<string, CountBucket>
  lobby_type: Record<string, CountBucket>
  is_radiant: Record<string, CountBucket>
}

/** OpenDota vracia v /players/{id}/heroes hero_id ako string. */
export interface PlayerHero {
  hero_id: string
  last_played: number
  games: number
  win: number
  with_games: number
  with_win: number
  against_games: number
  against_win: number
}

export interface MatchPlayer {
  account_id: number | null
  personaname?: string | null
  player_slot: number
  hero_id: number
  level: number
  kills: number
  deaths: number
  assists: number
  last_hits: number
  denies: number
  gold_per_min: number
  xp_per_min: number
  hero_damage: number
  tower_damage: number
  hero_healing: number
  net_worth?: number
  item_0: number
  item_1: number
  item_2: number
  item_3: number
  item_4: number
  item_5: number
  /** Prítomné len pri sparsovanom replayi (Expose Public Match Data). */
  gold_t?: number[] | null
  xp_t?: number[] | null
  /** Tento hráčov kill log — `key` je NPC meno OBETE (napr. npc_dota_hero_axe), nie killera. */
  kills_log?: { time: number; key: string }[] | null
  /** Tento hráčov nákupný log — `key` je interný item name (napr. "black_king_bar"),
   * teda kľúč z /constants/items, NIE číselné `id` používané v item_0..item_5. */
  purchase_log?: { time: number; key: string }[] | null
}

/** Jeden event z /matches/{id}.objectives (chat-log eventy — Roshan, veže,
 * rax, first blood...). Nie je zdokumentované OpenDotou, štruktúra overená
 * priamo na reálnom sparsovanom matchi. Polia sa líšia podľa `type`:
 * - `CHAT_MESSAGE_ROSHAN_KILL`: len `team` (2 = Radiant, 3 = Dire).
 * - `building_kill`: `key` je NPC meno ZNIČENEJ budovy (npc_dota_goodguys_*
 *   = padla Radiant stavba, npc_dota_badguys_* = padla Dire stavba — útočiaci
 *   tím je teda opačný). `unit`/`slot`/`player_slot` (killer) chýbajú, keď
 *   budovu dorazil creep, nie hráč. */
export interface MatchObjective {
  time: number
  type: string
  team?: number
  key?: string
  unit?: string
  slot?: number
  player_slot?: number
}

export interface MatchDetail {
  match_id: number
  start_time: number
  duration: number
  game_mode: number
  radiant_win: boolean
  radiant_score: number
  dire_score: number
  /** Prítomné len pri sparsovanom replayi (Expose Public Match Data). */
  radiant_gold_adv?: number[] | null
  radiant_xp_adv?: number[] | null
  objectives?: MatchObjective[] | null
  players: MatchPlayer[]
}

// --- Valve leaderboard (www.dota2.com/webapi, nie OpenDota) ---

export interface LeaderboardEntry {
  rank: number
  name: string
  team_id?: number
  team_tag?: string
  /** ISO kód krajiny, malé písmená (nie vždy prítomný). */
  country?: string
}

export interface LeaderboardResponse {
  time_posted: number
  next_scheduled_post_time: number
  leaderboard: LeaderboardEntry[]
}

export interface HeroConstant {
  id: number
  name: string
  localized_name: string
  primary_attr: string
  attack_type: string
  roles: string[]
  img: string
  icon: string
}

export interface ItemConstant {
  id: number
  /** Kľúč z /constants/items (napr. "black_king_bar") — nie je vo Valve dátach
   * priamo ako pole, je to kľúč rodičovského objektu; doplnené v getItemMap()/
   * getItemMapByName(). Zhoduje sa s `purchase_log[].key`. */
  name: string
  img: string
  dname?: string
  cost?: number | null
  /** "consumable"/"consumable;laning" = wardy, tp scrolly, tangá, dymovky...
   * "component"/"secret_shop"/"common"/"rare"/"epic"/"artifact" = skutočné
   * itemy (aj rozpracované, napr. Blink Dagger je "component"). Chýba pri
   * receptoch, tie sa ale v purchase_log nevyskytujú ako vlastný záznam. */
  qual?: string
}
