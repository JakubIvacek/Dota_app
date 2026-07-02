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
