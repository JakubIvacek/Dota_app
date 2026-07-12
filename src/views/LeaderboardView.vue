<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  LEADERBOARD_DIVISIONS,
  getLeaderboard,
  type LeaderboardDivision,
} from '../api/opendota'
import { useAsync } from '../composables/useAsync'
import { useAppLocale } from '../composables/useAppLocale'
import Skeleton from '../components/Skeleton.vue'

const { t, intlLocale } = useAppLocale()
const division = ref<LeaderboardDivision>('europe')
const shown = ref(100)

const { data, loading, error } = useAsync(() => getLeaderboard(division.value))

watch(division, () => (shown.value = 100))

const rows = computed(() => (data.value?.leaderboard ?? []).slice(0, shown.value))
const total = computed(() => data.value?.leaderboard.length ?? 0)

const updatedAt = computed(() =>
  data.value
    ? new Date(data.value.time_posted * 1000).toLocaleTimeString(intlLocale.value, {
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
    <h1>{{ t('leaderboard.title') }}</h1>
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

  <section v-if="loading" class="card skeleton-stack">
    <Skeleton v-for="i in 12" :key="i" variant="row" height="34px" />
  </section>
  <div v-else-if="error" class="error-box">{{ t('leaderboard.errorLoad', { error }) }}</div>

  <template v-else-if="data">
    <p class="muted note">
      {{ t('leaderboard.note', { total: total.toLocaleString(intlLocale), time: updatedAt }) }}
    </p>

    <div class="card">
      <table class="data">
        <thead>
          <tr>
            <th class="num">#</th>
            <th>{{ t('leaderboard.colPlayer') }}</th>
            <th>{{ t('leaderboard.colTeam') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in rows" :key="p.rank" class="lb-row">
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
        {{ t('leaderboard.showMore', { shown, total: total.toLocaleString(intlLocale) }) }}
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
  font-weight: var(--weight-medium);
  padding: 0.35rem 0.8rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out);
}

.tabs button:hover {
  background: var(--surface-2);
}

.tabs button.active {
  background: var(--accent-soft);
  color: var(--accent);
}

.lb-row {
  transition: background var(--duration-fast) var(--ease-out);
}

.lb-row:hover td {
  background: var(--surface-2);
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
  font-weight: var(--weight-semibold);
  padding: 0.5rem;
  cursor: pointer;
}

.more:hover {
  border-color: var(--accent);
  color: var(--ink);
}
</style>
