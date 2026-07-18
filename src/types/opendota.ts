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
  /** Poradie skillovania (ability ID za level-up) — prítomné len pri sparsovanom replayi. */
  ability_upgrades_arr?: number[] | null
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
  img: string
  dname?: string
  cost?: number | null
}

/** Kombinácia `constants/ability_ids` (ID → interné meno) a `constants/abilities`
 *  (interné meno → dname/img) do jednej mapy — viď getAbilityMap() v api/opendota.ts. */
export interface AbilityAttrib {
  key: string
  header?: string
  value: string | string[]
  generated?: boolean
}

export interface AbilityConstant {
  name: string
  dname: string
  img?: string
  /** Talent (level 10/15/20/25 voľba, max 4/hru), nie Q/W/E/R skill — meno začína `special_bonus_`. */
  isTalent: boolean
  /** Univerzálny "Attribute Bonus" pick (`special_bonus_attributes`/`attribute_bonus`) —
   *  alternatíva k skillovaniu dostupná na takmer každom leveli, nie viazaná na tiery
   *  10/15/20/25 ako talenty, môže sa v `ability_upgrades_arr` objaviť opakovane. */
  isAttributeBonus: boolean
  /** Niektoré schopnosti majú viacero behavior flagov naraz (napr. ["No Target", "Instant Cast"]). */
  behavior?: string | string[]
  dmgType?: string
  bkbPierce?: string
  dispellable?: string
  desc?: string
  lore?: string
  /** Normalizované na pole aj pri jednohodnotových passívkach (napr. `cd: "0.3"`). */
  manaCost?: string[]
  cooldown?: string[]
  attrib?: AbilityAttrib[]
}
