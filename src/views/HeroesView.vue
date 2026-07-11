<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getHeroMap, getPlayerHeroes } from '../api/opendota'
import { useAsync } from '../composables/useAsync'
import { timeAgo } from '../utils/format'
import { useAppLocale } from '../composables/useAppLocale'
import HeroIcon from '../components/HeroIcon.vue'
import WinrateBar from '../components/WinrateBar.vue'

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
  <section v-if="loading" class="card skeleton-table">
    <div v-for="i in 10" :key="i" class="skeleton skeleton-row" />
  </section>
  <div v-else-if="error" class="error-box">{{ t('heroes.errorLoad', { error }) }}</div>

  <div v-else class="card">
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

.skeleton-table {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.skeleton-row {
  height: 36px;
}
</style>
