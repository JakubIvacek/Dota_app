<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  GAME_MODES,
  MATCH_TREND_FIELDS,
  gameModeName,
  getCounts,
  getHeroMap,
  getMatches,
  getPlayerHeroes,
  getWinLoss,
  wonMatch,
} from '../api/opendota'
import { useAsync } from '../composables/useAsync'
import { formatDate, winratePct } from '../utils/format'
import { pickWindow, rollingAvg } from '../utils/stats'
import StatCard from '../components/StatCard.vue'
import HeroIcon from '../components/HeroIcon.vue'
import LineChart from '../components/LineChart.vue'
import ActivityHeatmap from '../components/ActivityHeatmap.vue'

const route = useRoute()

const { data, loading, error } = useAsync(async () => {
  const accountId = String(route.params.accountId)
  const [wl, recentMatches, yearMatches, playerHeroes, counts, heroMap] = await Promise.all([
    getWinLoss(accountId),
    getMatches(accountId, { limit: 100, project: MATCH_TREND_FIELDS }),
    // Celý posledný rok pre heatmapu — len minimálne polia, bez limitu.
    getMatches(accountId, { date: 365, project: ['start_time', 'player_slot', 'radiant_win'] }),
    getPlayerHeroes(accountId),
    getCounts(accountId),
    getHeroMap(),
  ])
  return { wl, recentMatches, yearMatches, playerHeroes, counts, heroMap }
})

const activityMatches = computed(() =>
  (data.value?.yearMatches ?? []).map((m) => ({ start_time: m.start_time, won: wonMatch(m) })),
)

/** Matche chronologicky — základ pre všetky trendy. */
const chronological = computed(() =>
  [...(data.value?.recentMatches ?? [])].sort((a, b) => a.start_time - b.start_time),
)

function trend(perMatch: number[], preferredWindow: number) {
  const window = pickWindow(perMatch.length, preferredWindow)
  return {
    window,
    labels: chronological.value.slice(window - 1).map((m) => formatDate(m.start_time)),
    values: rollingAvg(perMatch, window),
  }
}

const kdaTrend = computed(() =>
  trend(chronological.value.map((m) => (m.kills + m.assists) / Math.max(1, m.deaths)), 10),
)

const farmTrend = computed(() => {
  const gold = trend(chronological.value.map((m) => m.gold_per_min ?? 0), 10)
  const xp = rollingAvg(chronological.value.map((m) => m.xp_per_min ?? 0), gold.window)
  return { ...gold, xp }
})

const topHeroes = computed(() =>
  [...(data.value?.playerHeroes ?? [])]
    .sort((a, b) => b.games - a.games)
    .slice(0, 8)
    .map((h) => ({ ...h, hero: data.value?.heroMap.get(Number(h.hero_id)) })),
)

/** All-time winrate podľa game módu (z /counts), len módy so slušnou vzorkou. */
const modeStats = computed(() =>
  Object.entries(data.value?.counts.game_mode ?? {})
    .map(([mode, c]) => ({ mode: Number(mode), ...c }))
    .filter((c) => c.games >= 10 && (GAME_MODES[c.mode] || c.games >= 100))
    .sort((a, b) => b.games - a.games)
    .slice(0, 8),
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
        :tone="data.wl.win >= data.wl.lose ? 'win' : 'loss'"
      />
      <StatCard label="Wins" :value="String(data.wl.win)" tone="win" />
      <StatCard label="Losses" :value="String(data.wl.lose)" tone="loss" />
      <StatCard
        label="Winrate (last 100)"
        :value="`${recentWinrate} %`"
        :sub="`${data.recentMatches.length} matches`"
        :tone="recentWinrate === '—' ? 'default' : Number(recentWinrate) >= 50 ? 'win' : 'loss'"
      />
    </section>

    <section class="chart-grid">
      <div class="card">
        <h2>Najhranejší hrdinovia</h2>
        <table class="data">
          <thead>
            <tr>
              <th>Hero</th>
              <th class="num">Games</th>
              <th class="num">Winrate</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in topHeroes" :key="h.hero_id">
              <td><HeroIcon :hero="h.hero" /></td>
              <td class="num">{{ h.games }}</td>
              <td class="num">{{ winratePct(h.win, h.games) }} %</td>
            </tr>
          </tbody>
        </table>
        <p class="muted more">
          <RouterLink :to="`/player/${route.params.accountId}/heroes`">Všetci hrdinovia →</RouterLink>
        </p>
      </div>

      <div class="card">
        <h2>KDA — priemer {{ kdaTrend.window }} matchov</h2>
        <LineChart
          :labels="kdaTrend.labels"
          :datasets="[{ label: 'KDA', data: kdaTrend.values, color: '#199e70' }]"
          :y-format="(v) => v.toFixed(1)"
          :height="392"
        />
      </div>
    </section>

    <section class="card">
      <h2>Aktivita — posledný rok</h2>
      <ActivityHeatmap :matches="activityMatches" />
    </section>

    <section class="card">
      <h2>GPM / XPM — priemer {{ farmTrend.window }} matchov</h2>
      <LineChart
        :labels="farmTrend.labels"
        :datasets="[
          { label: 'GPM', data: farmTrend.values, color: '#c98500' },
          { label: 'XPM', data: farmTrend.xp, color: '#3987e5' },
        ]"
        :y-format="(v) => v.toFixed(0)"
        :height="220"
      />
    </section>

    <section class="card">
      <h2>Winrate podľa módu (all time)</h2>
      <table class="data">
        <thead>
          <tr>
            <th>Mode</th>
            <th class="num">Games</th>
            <th class="num">Winrate</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in modeStats" :key="m.mode">
            <td>{{ gameModeName(m.mode) }}</td>
            <td class="num">{{ m.games }}</td>
            <td class="num">{{ winratePct(m.win, m.games) }} %</td>
          </tr>
        </tbody>
      </table>
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

.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.more {
  margin: 0.75rem 0 0;
}
</style>
