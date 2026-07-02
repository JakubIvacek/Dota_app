import { ref } from 'vue'
import type { PlayerProfile } from '../types/opendota'

/** Nedávno pozreté profily — čisto lokálna história v localStorage. */
export interface RecentPlayer {
  account_id: string
  personaname: string
  avatarfull: string
  visited_at: number
}

const KEY = 'dotastats:recent-players'
const MAX = 8

function load(): RecentPlayer[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

const recents = ref<RecentPlayer[]>(load())

export function useRecentPlayers() {
  function record(player: PlayerProfile) {
    if (!player.profile) return
    const entry: RecentPlayer = {
      account_id: String(player.profile.account_id),
      personaname: player.profile.personaname,
      avatarfull: player.profile.avatarfull,
      visited_at: Date.now(),
    }
    recents.value = [
      entry,
      ...recents.value.filter((r) => r.account_id !== entry.account_id),
    ].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(recents.value))
  }

  return { recents, record }
}
