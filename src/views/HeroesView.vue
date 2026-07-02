<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getHeroMap, getPlayerHeroes } from '../api/opendota'
import { useAsync } from '../composables/useAsync'
import { timeAgo, winratePct } from '../utils/format'
import HeroIcon from '../components/HeroIcon.vue'

const route = useRoute()

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
  <p v-if="loading" class="muted">Loading…</p>
  <div v-else-if="error" class="error-box">Nepodarilo sa načítať hero štatistiky: {{ error }}</div>

  <div v-else class="card">
    <table class="data">
      <thead>
        <tr>
          <th class="sortable" @click="sortBy('name')">Hero{{ arrow('name') }}</th>
          <th class="sortable" @click="sortBy('games')">Games{{ arrow('games') }}</th>
          <th class="sortable" @click="sortBy('win')">Wins{{ arrow('win') }}</th>
          <th class="sortable" @click="sortBy('winrate')">Winrate{{ arrow('winrate') }}</th>
          <th class="sortable" @click="sortBy('last_played')">Last played{{ arrow('last_played') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="h in rows" :key="h.hero_id">
          <td><HeroIcon :hero="h.hero" /></td>
          <td>{{ h.games }}</td>
          <td>{{ h.win }}</td>
          <td>{{ winratePct(h.win, h.games) }} %</td>
          <td class="muted">{{ h.last_played ? timeAgo(h.last_played) : '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
th.sortable {
  cursor: pointer;
  user-select: none;
}

th.sortable:hover {
  color: var(--ink-2);
}
</style>
