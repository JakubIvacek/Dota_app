<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  getHeroMap,
  getMatches,
  getPlayerHeroes,
  getWinLoss,
  wonMatch,
} from '../api/opendota'
import { useAsync } from '../composables/useAsync'
import { formatDate, winratePct } from '../utils/format'
import StatCard from '../components/StatCard.vue'
import HeroIcon from '../components/HeroIcon.vue'
import LineChart from '../components/LineChart.vue'

const route = useRoute()

const { data, loading, error } = useAsync(async () => {
  const accountId = String(route.params.accountId)
  const [wl, recentMatches, playerHeroes, heroMap] = await Promise.all([
    getWinLoss(accountId),
    getMatches(accountId, 100),
    getPlayerHeroes(accountId),
    getHeroMap(),
  ])
  return { wl, recentMatches, playerHeroes, heroMap }
})

/** Kumulatívny winrate cez posledných 100 matchov (chronologicky). */
const winrateSeries = computed(() => {
  const matches = [...(data.value?.recentMatches ?? [])].sort(
    (a, b) => a.start_time - b.start_time,
  )
  let wins = 0
  const labels: string[] = []
  const values: number[] = []
  matches.forEach((m, i) => {
    if (wonMatch(m)) wins++
    labels.push(formatDate(m.start_time))
    values.push((wins / (i + 1)) * 100)
  })
  return { labels, values }
})

const topHeroes = computed(() =>
  [...(data.value?.playerHeroes ?? [])]
    .sort((a, b) => b.games - a.games)
    .slice(0, 8)
    .map((h) => ({ ...h, hero: data.value?.heroMap.get(Number(h.hero_id)) })),
)

const recentWinrate = computed(() => {
  const matches = data.value?.recentMatches ?? []
  return winratePct(matches.filter(wonMatch).length, matches.length)
})
</script>

<template>
  <p v-if="loading" class="muted">Loading…</p>
  <div v-else-if="error" class="error-box">Nepodarilo sa načítať dáta: {{ error }}</div>

  <template v-else-if="data">
    <section class="stats">
      <StatCard
        label="Winrate (all time)"
        :value="`${winratePct(data.wl.win, data.wl.win + data.wl.lose)} %`"
        :sub="`${data.wl.win} W – ${data.wl.lose} L`"
      />
      <StatCard label="Wins" :value="String(data.wl.win)" />
      <StatCard label="Losses" :value="String(data.wl.lose)" />
      <StatCard
        label="Winrate (last 100)"
        :value="`${recentWinrate} %`"
        :sub="`${data.recentMatches.length} matches`"
      />
    </section>

    <section class="card">
      <h2>Winrate v čase — posledných {{ data.recentMatches.length }} matchov</h2>
      <LineChart
        :labels="winrateSeries.labels"
        :datasets="[{ label: 'Winrate', data: winrateSeries.values, color: '#3987e5' }]"
        :y-format="(v) => `${v.toFixed(0)} %`"
      />
    </section>

    <section class="card">
      <h2>Najhranejší hrdinovia</h2>
      <table class="data">
        <thead>
          <tr>
            <th>Hero</th>
            <th>Games</th>
            <th>Wins</th>
            <th>Winrate</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="h in topHeroes" :key="h.hero_id">
            <td><HeroIcon :hero="h.hero" /></td>
            <td>{{ h.games }}</td>
            <td>{{ h.win }}</td>
            <td>{{ winratePct(h.win, h.games) }} %</td>
          </tr>
        </tbody>
      </table>
      <p class="muted more">
        <RouterLink :to="`/player/${route.params.accountId}/heroes`">Všetci hrdinovia →</RouterLink>
      </p>
    </section>
  </template>
</template>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

section.card {
  margin-bottom: 1rem;
}

.more {
  margin: 0.75rem 0 0;
}
</style>
