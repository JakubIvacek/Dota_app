<script setup lang="ts">
import { useAppLocale } from '../composables/useAppLocale'
import { cssVar } from '../utils/theme'
import { rankTierName } from '../api/opendota'
import StatCard from './StatCard.vue'
import WinrateBar from './WinrateBar.vue'
import RankBadge from './RankBadge.vue'
import LineChart from './LineChart.vue'

const { t } = useAppLocale()

/** Ilustratívne demo dáta — nie skutočné štatistiky hráča. */
const demoHeroes = [
  { name: 'Invoker', win: 62, games: 104 },
  { name: 'Pudge', win: 71, games: 130 },
  { name: 'Anti-Mage', win: 48, games: 76 },
]

/** Ancient → Divine → Immortal — a short climb, not the full medal ladder. */
const demoRankTiers = [63, 75, 80]
</script>

<template>
  <section class="showcase">
    <span class="eyebrow">{{ t('home.features.eyebrow') }}</span>
    <h2>{{ t('home.features.title') }}</h2>

    <div class="bento">
      <div class="tile tile--dashboard">
        <div class="tile-head">
          <h3>{{ t('home.features.dashboard.title') }}</h3>
          <p class="muted">{{ t('home.features.dashboard.desc') }}</p>
        </div>
        <div class="tile-stats">
          <StatCard :label="t('home.features.dashboard.statWinrate')" value="58 %" tone="win" size="lg" show-badge />
          <StatCard :label="t('home.features.dashboard.statAvg')" value="34 min" />
        </div>
        <div class="tile-chart" aria-hidden="true">
          <LineChart
            :labels="['6/8', '6/16', '6/21', '6/28', '7/3', '7/10']"
            :datasets="[
              { label: 'GPM', data: [520, 560, 540, 610, 545, 590], color: cssVar('--gold') },
              { label: 'XPM', data: [740, 830, 780, 880, 720, 830], color: cssVar('--accent') },
            ]"
            :height="120"
          />
        </div>
      </div>

      <div class="tile tile--ranks">
        <div class="tile-head">
          <h3>{{ t('home.features.ranks.title') }}</h3>
          <p class="muted">{{ t('home.features.ranks.desc') }}</p>
        </div>
        <div class="rank-climb">
          <div v-for="tier in demoRankTiers" :key="tier" class="rank-item">
            <RankBadge :rank-tier="tier" size="lg" />
            <span class="rank-name muted">{{ rankTierName(tier) }}</span>
          </div>
        </div>
      </div>

      <div class="tile tile--heroes">
        <div class="tile-head">
          <h3>{{ t('home.features.heroes.title') }}</h3>
          <p class="muted">{{ t('home.features.heroes.desc') }}</p>
        </div>
        <ul class="hero-rows">
          <li v-for="h in demoHeroes" :key="h.name">
            <span class="hero-name">{{ h.name }}</span>
            <WinrateBar :win="h.win" :games="h.games" />
          </li>
        </ul>
      </div>

      <div class="tile tile--matches">
        <div class="tile-head">
          <h3>{{ t('home.features.matches.title') }}</h3>
          <p class="muted">{{ t('home.features.matches.desc') }}</p>
        </div>
        <ul class="match-rows">
          <li class="match-row">
            <span class="team-chip radiant" aria-hidden="true" />
            <span class="match-label">{{ t('home.features.matches.radiantWin') }}</span>
            <span class="badge win">W</span>
          </li>
          <li class="match-row">
            <span class="team-chip dire" aria-hidden="true" />
            <span class="match-label">{{ t('home.features.matches.direWin') }}</span>
            <span class="badge loss">L</span>
          </li>
        </ul>
      </div>

      <RouterLink to="/leaderboard" class="tile tile--leaderboard card--interactive" :aria-label="t('home.features.leaderboard.title')">
        <div class="tile-head">
          <h3>{{ t('home.features.leaderboard.title') }}<span class="chevron" aria-hidden="true">→</span></h3>
          <p class="muted">{{ t('home.features.leaderboard.desc') }}</p>
        </div>
        <ol class="leaderboard-rows">
          <li v-for="n in 3" :key="n">
            <span class="lb-rank" :class="{ gold: n === 1 }">#{{ n }}</span>
            <span class="lb-name">{{ t('common.playerFallback', { id: 1000 + n }) }}</span>
          </li>
        </ol>
      </RouterLink>
    </div>

    <p class="status-note teammates-note">{{ t('home.features.teammatesNote') }}</p>
    <p class="status-note private-note">{{ t('home.features.privateNote') }}</p>
  </section>
</template>

<style scoped>
/* Showcase — fills the empty space below the hero with a preview of what the
   app actually shows once you search a player. Bento grid, not a uniform row,
   so the dashboard tile (the richest feature) reads as the anchor. */
.showcase {
  margin-top: var(--space-10);
  width: 100%;
  max-width: 980px;
  text-align: left;
}

.showcase .eyebrow {
  display: block;
}

.showcase h2 {
  margin-top: var(--space-2);
  font-size: var(--text-lg);
}

.teammates-note {
  margin-top: var(--space-5);
}

.private-note {
  margin-top: var(--space-3);
}

.bento {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-auto-rows: minmax(0, auto);
  gap: var(--space-4);
  margin-top: var(--space-5);
}

.tile {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 40%), var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  animation: card-in var(--duration-normal) var(--ease-out) both;
  color: var(--ink);
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}

/* Row 1: dashboard (the richest tile) anchors wide, ranks sits compact beside
   it. Row 2: three even tiles. DOM order already matches this fill order, so
   auto-placement does the work without an explicit `order`. */
.tile--dashboard { grid-column: span 4; }
.tile--ranks { grid-column: span 2; }
.tile--heroes { grid-column: span 2; }
.tile--matches { grid-column: span 2; }
.tile--leaderboard { grid-column: span 2; }

.tile-head h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 0.2rem;
  font-size: var(--text-md);
}

.chevron {
  color: var(--accent);
  font-weight: var(--weight-bold);
}

.tile-head p {
  margin: 0;
  font-size: var(--text-sm);
}

.tile-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.tile-stats :deep(.stat) {
  padding: var(--space-3) var(--space-4);
}

.hero-rows,
.match-rows,
.leaderboard-rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.hero-rows li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.hero-name {
  font-weight: var(--weight-semibold);
  white-space: nowrap;
}

.match-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.team-chip {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-pill);
  flex-shrink: 0;
}

.team-chip.radiant { background: var(--radiant); box-shadow: 0 0 0 3px var(--radiant-soft); }
.team-chip.dire { background: var(--dire); box-shadow: 0 0 0 3px var(--dire-soft); }

.match-label {
  flex: 1;
  color: var(--ink-2);
}

/* Vertical climb, not a wrapping row — a horizontal row of 5 medals+labels
   doesn't fit this tile's width without an awkward wrap mid-chain, and a
   column reads naturally as "climbing" while filling the tile's height
   (it sits next to the taller dashboard tile). */
.rank-climb {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-4);
  margin: auto 0;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.rank-name {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
}

.leaderboard-rows li {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.lb-rank {
  min-width: 2rem;
  font-family: var(--font-display);
  font-weight: var(--weight-bold);
  color: var(--muted);
}

.lb-rank.gold {
  color: var(--gold);
}

.lb-name {
  color: var(--ink-2);
}

@media (max-width: 860px) {
  .bento {
    grid-template-columns: 1fr;
  }

  .tile--dashboard,
  .tile--heroes,
  .tile--matches,
  .tile--ranks,
  .tile--leaderboard {
    grid-column: span 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tile {
    animation: none;
  }
}
</style>
