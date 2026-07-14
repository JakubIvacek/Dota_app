<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getHeroMap, getPlayerHeroes } from '../api/opendota'
import { useAsync } from '../composables/useAsync'
import { timeAgo } from '../utils/format'
import { useAppLocale } from '../composables/useAppLocale'
import HeroIcon from '../components/HeroIcon.vue'
import WinrateBar from '../components/WinrateBar.vue'
import Skeleton from '../components/Skeleton.vue'

const route = useRoute()
const { t, intlLocale } = useAppLocale()

const { data, loading, error } = useAsync(async () => {
  const accountId = String(route.params.accountId)
  const [playerHeroes, heroMap] = await Promise.all([getPlayerHeroes(accountId), getHeroMap()])
  return { playerHeroes, heroMap }
})

type SortKey = 'name' | 'games' | 'win' | 'winrate' | 'last_played'
const sortKey = ref<SortKey>('games')
const sortDesc = ref(true)

function sortBy(key: SortKey) {
  if (sortKey.value === key) {
    sortDesc.value = !sortDesc.value
  } else {
    sortKey.value = key
    sortDesc.value = key !== 'name'
  }
}

function onSortKeyChange(event: Event) {
  sortBy((event.target as HTMLSelectElement).value as SortKey)
}

const rows = computed(() => {
  const joined = (data.value?.playerHeroes ?? [])
    .filter((h) => h.games > 0)
    .map((h) => ({
      ...h,
      hero: data.value?.heroMap.get(Number(h.hero_id)),
      winrate: h.win / h.games,
    }))

  const dir = sortDesc.value ? -1 : 1
  return joined.sort((a, b) => {
    if (sortKey.value === 'name') {
      return dir * (a.hero?.localized_name ?? '').localeCompare(b.hero?.localized_name ?? '')
    }
    return dir * (a[sortKey.value] - b[sortKey.value])
  })
})

const arrow = (key: SortKey) => (sortKey.value === key ? (sortDesc.value ? ' ▾' : ' ▴') : '')
</script>

<template>
  <section v-if="loading" class="card skeleton-stack">
    <Skeleton v-for="i in 10" :key="i" variant="row" height="36px" />
  </section>
  <div v-else-if="error" class="error-box">{{ t('heroes.errorLoad', { error }) }}</div>

  <div v-else class="card">
    <div class="table-scroll desktop-table">
      <table class="data">
        <thead>
          <tr>
            <th class="sortable" @click="sortBy('name')">{{ t('heroes.colHero') }}{{ arrow('name') }}</th>
            <th class="sortable num" @click="sortBy('games')">{{ t('heroes.colGames') }}{{ arrow('games') }}</th>
            <th class="sortable num" @click="sortBy('win')">{{ t('heroes.colWins') }}{{ arrow('win') }}</th>
            <th class="sortable" @click="sortBy('winrate')">{{ t('heroes.colWinrate') }}{{ arrow('winrate') }}</th>
            <th class="sortable" @click="sortBy('last_played')">{{ t('heroes.colLastPlayed') }}{{ arrow('last_played') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="h in rows" :key="h.hero_id" class="hero-row">
            <td><HeroIcon :hero="h.hero" /></td>
            <td class="num">{{ h.games }}</td>
            <td class="num">{{ h.win }}</td>
            <td><WinrateBar :win="h.win" :games="h.games" /></td>
            <td class="muted">{{ h.last_played ? timeAgo(h.last_played, intlLocale) : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mobile-sort">
      <label>
        {{ t('heroes.sortLabel') }}
        <select :value="sortKey" @change="onSortKeyChange">
          <option value="name">{{ t('heroes.colHero') }}</option>
          <option value="games">{{ t('heroes.colGames') }}</option>
          <option value="win">{{ t('heroes.colWins') }}</option>
          <option value="winrate">{{ t('heroes.colWinrate') }}</option>
          <option value="last_played">{{ t('heroes.colLastPlayed') }}</option>
        </select>
      </label>
      <button
        type="button"
        class="sort-dir-btn"
        :aria-label="sortDesc ? t('heroes.sortDescending') : t('heroes.sortAscending')"
        @click="sortBy(sortKey)"
      >
        {{ sortDesc ? '▾' : '▴' }}
      </button>
    </div>

    <ul class="mobile-heroes">
      <li v-for="h in rows" :key="h.hero_id" class="hero-card">
        <div class="hero-card-top">
          <HeroIcon :hero="h.hero" />
          <WinrateBar :win="h.win" :games="h.games" />
        </div>
        <div class="hero-card-stats">
          <span>{{ h.win }} {{ t('heroes.colWins') }}</span>
          <span class="dot">·</span>
          <span>{{ h.games }} {{ t('heroes.colGames') }}</span>
        </div>
        <div class="muted hero-card-time">{{ h.last_played ? timeAgo(h.last_played, intlLocale) : '—' }}</div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
th.sortable {
  cursor: pointer;
  user-select: none;
  transition: color var(--duration-fast) var(--ease-out);
}

th.sortable:hover {
  color: var(--ink-2);
}

.hero-row {
  transition: background var(--duration-fast) var(--ease-out);
}

.hero-row:hover td {
  background: var(--surface-2);
}

/* Mobile card list — hidden by default, swapped in for the table below
   720px so hero stats read top-to-bottom instead of needing a horizontal
   scroll to see games/wins/winrate/last played. */
.mobile-heroes {
  display: none;
}

.mobile-sort {
  display: none;
}

@media (max-width: 720px) {
  .desktop-table {
    display: none;
  }

  .mobile-heroes {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .mobile-sort {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }
}

.mobile-sort label {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--text-sm);
  color: var(--muted);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

.mobile-sort select {
  flex: 1;
  background: var(--page);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--ink);
  font: inherit;
  text-transform: none;
  letter-spacing: normal;
  font-weight: 400;
  padding: 0.35rem 0.6rem;
}

.mobile-sort select:focus {
  outline: none;
  border-color: var(--accent);
}

.sort-dir-btn {
  background: var(--surface-2);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--ink-2);
  font: inherit;
  font-weight: var(--weight-semibold);
  padding: 0.35rem 0.7rem;
  cursor: pointer;
}

.sort-dir-btn:hover {
  border-color: var(--accent);
  color: var(--ink);
}

.hero-card {
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  transition: border-color var(--duration-fast) var(--ease-out), background var(--duration-fast) var(--ease-out);
}

.hero-card:hover {
  border-color: var(--border-strong);
  background: var(--surface-2);
}

.hero-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.hero-card-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.3rem;
  margin-top: var(--space-2);
  font-variant-numeric: tabular-nums;
}

.hero-card-stats .dot {
  color: var(--muted);
}

.hero-card-time {
  margin-top: 0.2rem;
  font-size: var(--text-sm);
}
</style>
