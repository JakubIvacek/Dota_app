import { onMounted, ref } from 'vue'
import { getProPlayers, getTeams } from '../api/opendota'
import type { ProPlayer } from '../types/opendota'

const SAMPLE_SIZE = 8

// OpenDota's raw /proPlayers list has thousands of entries — many obscure,
// inactive, or roster alumni. Narrow the scouting pool down to players
// currently on one of the top-N teams by rating (/teams is pre-sorted
// descending), which in practice lands around 50 candidates — a small,
// actually-recognizable pool to sample suggestions from.
const TOP_TEAMS_COUNT = 30
const ACTIVE_WITHIN_MS = 90 * 24 * 60 * 60 * 1000

function sample<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

/**
 * "Players to explore" suggestions for the home page — a random sample from
 * a scouted pool of real, live pro-player profiles (players currently
 * rostered on one of the top-rated teams, per OpenDota's own /teams and
 * /proPlayers data), not hand-picked account IDs (Steam personanames are
 * freely editable, so a hardcoded ID can't be verified to actually belong to
 * who it's meant to represent). Always shown, independent of the user's own
 * favorites/recent players.
 */
export function useSuggestedPlayers() {
  const players = ref<ProPlayer[]>([])
  const loading = ref(true)

  onMounted(async () => {
    try {
      const [teams, pros] = await Promise.all([getTeams(), getProPlayers()])
      const topTeamIds = new Set(teams.slice(0, TOP_TEAMS_COUNT).map((t) => t.team_id))
      const cutoff = Date.now() - ACTIVE_WITHIN_MS

      const pool = pros.filter(
        (p) =>
          p.team_id != null &&
          topTeamIds.has(p.team_id) &&
          p.name &&
          p.avatarfull &&
          p.last_match_time != null &&
          new Date(p.last_match_time).getTime() > cutoff,
      )
      players.value = sample(pool, SAMPLE_SIZE)
    } catch {
      players.value = []
    } finally {
      loading.value = false
    }
  })

  return { players, loading }
}
