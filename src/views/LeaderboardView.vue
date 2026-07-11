<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  LEADERBOARD_DIVISIONS,
  getLeaderboard,
  type LeaderboardDivision,
} from '../api/opendota'
import { useAsync } from '../composables/useAsync'

const division = ref<LeaderboardDivision>('europe')
const shown = ref(100)

const { data, loading, error } = useAsync(() => getLeaderboard(division.value))

watch(division, () => (shown.value = 100))

const rows = computed(() => (data.value?.leaderboard ?? []).slice(0, shown.value))
const total = computed(() => data.value?.leaderboard.length ?? 0)

const updatedAt = computed(() =>
  data.value
    ? new Date(data.value.time_posted * 1000).toLocaleTimeString('sk-SK', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : '',
)

/** ISO kód krajiny → emoji vlajka (regional indicators). */
function flag(country?: string): string {
  if (!country || country.length !== 2) return ''
  return [...country.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('')
}
</script>

<template>
  <div class="head">
    <h1>Leaderboards</h1>
    <nav class="tabs">
      <button
        v-for="d in LEADERBOARD_DIVISIONS"
        :key="d.id"
        :class="{ active: division === d.id }"
        @click="division = d.id"
      >
        {{ d.label }}
      </button>
    </nav>
  </div>

  <p v-if="loading" class="muted">Loading…</p>
  <div v-else-if="error" class="error-box">Nepodarilo sa načítať leaderboard: {{ error }}</div>

  <template v-else-if="data">
    <p class="muted note">
      Top {{ total.toLocaleString('sk-SK') }} · aktualizované {{ updatedAt }} · zdroj Valve.
      Valve nezverejňuje account ID — klik na meno skúsi hráča nájsť cez OpenDota search.
    </p>

    <div class="card">
      <table class="data">
        <thead>
          <tr>
            <th class="num">#</th>
            <th>Player</th>
            <th>Team</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in rows" :key="p.rank">
            <td class="num rank">{{ p.rank }}</td>
            <td>
              <RouterLink class="player" :to="{ name: 'search', query: { q: p.name } }">
                <span class="flag" :class="{ placeholder: !flag(p.country) }">{{
                  flag(p.country) || '🌐'
                }}</span>{{ p.name }}
              </RouterLink>
            </td>
            <td class="muted">{{ p.team_tag ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
      <button v-if="shown < total" class="more" @click="shown += 200">
        Zobraziť ďalších 200 ({{ shown }} / {{ total.toLocaleString('sk-SK') }})
      </button>
    </div>
  </template>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.head h1 {
  margin: 0;
}

.tabs {
  display: flex;
  gap: 0.4rem;
}

.tabs button {
  background: none;
  border: none;
  color: var(--ink-2);
  font: inherit;
  font-weight: 550;
  padding: 0.35rem 0.8rem;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.tabs button:hover {
  background: var(--surface-2);
}

.tabs button.active {
  background: rgba(57, 135, 229, 0.15);
  color: var(--accent);
}

.note {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
}

.rank {
  color: var(--muted);
  width: 3.5rem;
}

.num {
  text-align: right;
}

.player {
  color: var(--ink);
}

.player:hover {
  color: var(--accent);
}

.flag {
  display: inline-block;
  min-width: 1.6rem;
}

/* Hráč bez krajiny — tlmený glóbus, nech stĺpec drží zarovnanie. */
.flag.placeholder {
  filter: grayscale(1);
  opacity: 0.4;
}

.more {
  display: block;
  width: 100%;
  margin-top: 0.5rem;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--ink-2);
  font: inherit;
  font-weight: 600;
  padding: 0.5rem;
  cursor: pointer;
}

.more:hover {
  border-color: var(--accent);
  color: var(--ink);
}
</style>
