import { ref } from 'vue'
import type { PlayerProfile } from '../types/opendota'

/** Obľúbení hráči — localStorage, rovnaký princíp ako useRecentPlayers. */
export interface FavoritePlayer {
  account_id: string
  personaname: string
  avatarfull: string
  added_at: number
}

const KEY = 'dotastats:favorite-players'

function load(): FavoritePlayer[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

const favorites = ref<FavoritePlayer[]>(load())

function persist() {
  localStorage.setItem(KEY, JSON.stringify(favorites.value))
}

export function useFavorites() {
  const isFavorite = (accountId: string) =>
    favorites.value.some((f) => f.account_id === accountId)

  function toggle(player: PlayerProfile) {
    if (!player.profile) return
    const id = String(player.profile.account_id)
    if (isFavorite(id)) {
      favorites.value = favorites.value.filter((f) => f.account_id !== id)
    } else {
      favorites.value = [
        {
          account_id: id,
          personaname: player.profile.personaname,
          avatarfull: player.profile.avatarfull,
          added_at: Date.now(),
        },
        ...favorites.value,
      ]
    }
    persist()
  }

  return { favorites, isFavorite, toggle }
}
