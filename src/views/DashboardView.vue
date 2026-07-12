<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAppLocale } from '../composables/useAppLocale'
import {
  GAME_MODES,
  MATCH_TREND_FIELDS,
  gameModeName,
  getCounts,
  getHeroMap,
  getMatches,
  getPlayerHeroes,
  getWinLoss,
  requestPlayerRefresh,
  wonMatch,
} from '../api/opendota'
import { useAsync } from '../composables/useAsync'
import { formatDuration, formatShortDate, winratePct } from '../utils/format'
import { pickWindow, rollingAvg } from '../utils/stats'
import { cssVar } from '../utils/theme'
import StatCard from '../components/StatCard.vue'
import HeroIcon from '../components/HeroIcon.vue'
import LineChart from '../components/LineChart.vue'
import ActivityHeatmap from '../components/ActivityHeatmap.vue'
import WinrateBar from '../components/WinrateBar.vue'
import Skeleton from '../components/Skeleton.vue'

const route = useRoute()
const { t, intlLocale } = useAppLocale()

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
    labels: chronological.value.slice(window - 1).map((m) => formatShortDate(m.start_time, intlLocale.value)),
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

const recentWinLoss = computed(() => {
  const matches = data.value?.recentMatches ?? []
  const wins = matches.filter(wonMatch).length
  return { wins, losses: matches.length - wins }
})

const lastMatchStats = computed(() => {
  const match = data.value?.recentMatches[0]
  if (!match) return null
  return { ...match, won: wonMatch(match) }
})

const avgMatchStats = computed(() => {
  const matches = data.value?.recentMatches ?? []
  if (matches.length === 0) return null
  const avg = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / matches.length
  return {
    duration: avg(matches.map((m) => m.duration)),
    gpm: Math.round(avg(matches.map((m) => m.gold_per_min ?? 0))),
    xpm: Math.round(avg(matches.map((m) => m.xp_per_min ?? 0))),
    kills: avg(matches.map((m) => m.kills)).toFixed(1),
    deaths: avg(matches.map((m) => m.deaths)).toFixed(1),
  }
})

// Nulové wl + žiadne matche = OpenDota tohto hráča ešte nezaindexovala.
const notIndexed = computed(
  () => !!data.value && data.value.wl.win + data.value.wl.lose === 0 && data.value.recentMatches.length === 0,
)

const refreshing = ref(false)
const refreshRequested = ref(false)
const refreshError = ref<string | null>(null)

async function refreshFromOpenDota() {
  refreshing.value = true
  refreshError.value = null
  try {
    await requestPlayerRefresh(String(route.params.accountId))
    refreshRequested.value = true
  } catch (e) {
    refreshError.value = e instanceof Error ? e.message : String(e)
  } finally {
    refreshing.value = false
  }
}
</script>

<template>
  <section v-if="loading" class="stats">
    <Skeleton variant="block" height="108px" class="card" />
    <Skeleton variant="block" height="108px" class="card" />
    <Skeleton variant="block" height="108px" class="card" />
    <Skeleton variant="block" height="108px" class="card" />
  </section>
  <div v-else-if="error" class="error-box">{{ t('dashboard.errorLoad', { error }) }}</div>

  <template v-else-if="data">
    <div v-if="notIndexed" class="card empty-state">
      <p class="muted">{{ t('dashboard.notIndexedText') }}</p>
      <button class="refresh-btn" :disabled="refreshing || refreshRequested" @click="refreshFromOpenDota">
        {{ refreshing ? t('dashboard.refreshRequesting') : refreshRequested ? t('dashboard.refreshDone') : t('dashboard.refreshIdle') }}
      </button>
      <p v-if="refreshError" class="error-box">{{ refreshError }}</p>
    </div>

    <section class="stats">
      <StatCard
        :label="t('dashboard.statWinrateAllTime')"
        :value="`${winratePct(data.wl.win, data.wl.win + data.wl.lose)} %`"
        :sub="`${data.wl.win + data.wl.lose} ${t('dashboard.gamesSuffix')} · ${data.wl.win} W – ${data.wl.lose} L`"
        :tone="data.wl.win >= data.wl.lose ? 'win' : 'loss'"
        size="lg"
      />
      <StatCard
        v-if="lastMatchStats"
        :label="t('dashboard.statLastMatch')"
        :value="formatDuration(lastMatchStats.duration)"
        :tone="lastMatchStats.won ? 'win' : 'loss'"
        show-badge
        :sub="`${lastMatchStats.gold_per_min ?? 0} GPM · ${lastMatchStats.xp_per_min ?? 0} XPM\n${lastMatchStats.kills} K / ${lastMatchStats.deaths} D / ${lastMatchStats.assists} A`"
      />
      <StatCard
        :label="t('dashboard.statWinrateRecent')"
        :value="`${recentWinrate} %`"
        :sub="`${data.recentMatches.length} ${t('dashboard.matchesSuffix')}\n${recentWinLoss.wins} W / ${recentWinLoss.losses} L`"
        :tone="recentWinrate === '—' ? 'default' : Number(recentWinrate) >= 50 ? 'win' : 'loss'"
      />
      <StatCard
        v-if="avgMatchStats"
        :label="t('dashboard.statAvgMatch')"
        :value="formatDuration(Math.round(avgMatchStats.duration))"
        :sub="`${avgMatchStats.gpm} GPM · ${avgMatchStats.xpm} XPM\n${avgMatchStats.kills} K / ${avgMatchStats.deaths} D`"
      />
    </section>

    <section class="chart-grid">
      <div class="card">
        <h2>{{ t('dashboard.topHeroes') }}</h2>
        <div class="table-scroll">
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
        </div>
        <p class="muted more">
          <RouterLink :to="`/player/${route.params.accountId}/heroes`">{{ t('dashboard.allHeroes') }}</RouterLink>
        </p>
      </div>

      <div class="card">
        <h2>{{ t('dashboard.kdaTrend', { window: kdaTrend.window }) }}</h2>
        <LineChart
          :labels="kdaTrend.labels"
          :datasets="[{ label: 'KDA', data: kdaTrend.values, color: cssVar('--kda') }]"
          :y-format="(v) => v.toFixed(1)"
          :height="392"
        />
      </div>
    </section>

    <section class="card">
      <h2>{{ t('dashboard.activityTitle') }}</h2>
      <ActivityHeatmap :matches="activityMatches" />
    </section>

    <section class="card">
      <h2>{{ t('dashboard.farmTrend', { window: farmTrend.window }) }}</h2>
      <LineChart
        :labels="farmTrend.labels"
        :datasets="[
          { label: 'GPM', data: farmTrend.values, color: cssVar('--gold') },
          { label: 'XPM', data: farmTrend.xp, color: cssVar('--accent') },
        ]"
        :y-format="(v) => v.toFixed(0)"
        :height="220"
      />
    </section>

    <section class="card">
      <h2>{{ t('dashboard.winrateByMode') }}</h2>
      <div class="table-scroll">
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
              <td><WinrateBar :win="m.win" :games="m.games" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </template>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.refresh-btn {
  background: var(--accent);
  border: none;
  border-radius: var(--radius-md);
  color: #fff;
  font: inherit;
  font-weight: var(--weight-semibold);
  padding: 0.45rem 1rem;
  cursor: pointer;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.refresh-btn:hover {
  opacity: 0.9;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

/* Featured stat gets double width — bento, not four identical boxes. */
.stats > :first-child {
  grid-column: span 2;
}

@media (max-width: 720px) {
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .stats > :first-child {
    grid-column: span 1;
  }
}

section.card {
  margin-bottom: 1rem;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.more {
  margin: 0.75rem 0 0;
}
</style>
