<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ACCOUNT_ID } from '../config'
import {
  gameModeName,
  getHeroMap,
  getItemMap,
  getMatch,
  isRadiantSlot,
  itemImageUrl,
  requestMatchParse,
} from '../api/opendota'
import { useAsync } from '../composables/useAsync'
import { formatDate, formatDuration } from '../utils/format'
import { cssVar } from '../utils/theme'
import { useAppLocale } from '../composables/useAppLocale'
import Breadcrumb from '../components/Breadcrumb.vue'
import HeroIcon from '../components/HeroIcon.vue'
import LineChart from '../components/LineChart.vue'
import TeamGlyph from '../components/TeamGlyph.vue'
import Skeleton from '../components/Skeleton.vue'
import type { MatchPlayer } from '../types/opendota'

const route = useRoute()
const { t, intlLocale } = useAppLocale()

// Zvýrazni hráča, z ktorého profilu sme prišli (?player=), inak vlastný.
const highlightId = computed(() => String(route.query.player ?? ACCOUNT_ID))

// Späť na Matches tab hráča, z ktorého profilu sme prišli; bez ?player= a bez
// nastaveného ACCOUNT_ID (napr. priamo otvorený zdieľaný odkaz) padni na domov,
// nech odkaz nikdy nesmeruje na /player//matches.
const backTarget = computed(() => (highlightId.value ? `/player/${highlightId.value}/matches` : '/'))

const breadcrumbItems = computed(() => [
  { label: t('player.tabMatches'), to: backTarget.value },
  { label: `Match #${data.value?.match.match_id ?? route.params.id}` },
])

const { data, loading, error } = useAsync(async () => {
  const matchId = String(route.params.id)
  const [match, heroMap, itemMap] = await Promise.all([
    getMatch(matchId),
    getHeroMap(),
    getItemMap(),
  ])
  return { match, heroMap, itemMap }
})

const ITEM_SLOTS = ['item_0', 'item_1', 'item_2', 'item_3', 'item_4', 'item_5'] as const

function playerRow(p: MatchPlayer) {
  return {
    ...p,
    hero: data.value?.heroMap.get(p.hero_id),
    items: ITEM_SLOTS.map((slot) => data.value?.itemMap.get(p[slot])).filter(Boolean),
    isMe: p.account_id != null && String(p.account_id) === highlightId.value,
  }
}

// MVP = najvyšší hero_damage na víťaznom tíme; nezávislé od "isMe" (identita vs. výkon).
function withMvp<T extends { hero_damage: number }>(players: T[], isWinner: boolean) {
  if (!isWinner) return players.map((p) => ({ ...p, isMvp: false }))
  const best = players.reduce((max, p) => (p.hero_damage > max ? p.hero_damage : max), -1)
  return players.map((p) => ({ ...p, isMvp: p.hero_damage === best }))
}

const radiant = computed(() =>
  withMvp(
    (data.value?.match.players ?? []).filter((p) => isRadiantSlot(p.player_slot)).map(playerRow),
    data.value?.match.radiant_win ?? false,
  ),
)
const dire = computed(() =>
  withMvp(
    (data.value?.match.players ?? []).filter((p) => !isRadiantSlot(p.player_slot)).map(playerRow),
    data.value?.match.radiant_win === false,
  ),
)

/**
 * Auto-parse: nesparsovaný match → pošli OpenDote parse request a každú
 * minútu skús graf doťiahnuť. Replaye expirujú (~2–4 týždne), staré matche
 * preto ani neskúšame.
 */
const REPLAY_EXPIRY_DAYS = 30
const POLL_MS = 60_000
const MAX_POLLS = 8

type ParseState = 'idle' | 'polling' | 'expired' | 'gave_up'
const parseState = ref<ParseState>('idle')

// Dedup v rámci života komponentu; prípadný duplicitný request po remounte OpenDote nevadí.
const alreadyRequested = new Set<string>()

let pollTimer: number | undefined
let polls = 0

function stopPolling() {
  if (pollTimer != null) window.clearInterval(pollTimer)
  pollTimer = undefined
}

async function startAutoParse(matchId: string) {
  parseState.value = 'polling'
  polls = 0
  if (!alreadyRequested.has(matchId)) {
    alreadyRequested.add(matchId)
    // Aj keby request zlyhal (rate limit…), poll má zmysel — parse mohol vyžiadať niekto iný.
    await requestMatchParse(matchId).catch(() => {})
  }
  pollTimer = window.setInterval(async () => {
    polls++
    const fresh = await getMatch(matchId, { fresh: true }).catch(() => null)
    if (fresh?.radiant_gold_adv?.length && data.value) {
      stopPolling()
      data.value = { ...data.value, match: fresh }
    } else if (polls >= MAX_POLLS) {
      stopPolling()
      parseState.value = 'gave_up'
    }
  }, POLL_MS)
}

watch(
  () => data.value?.match,
  (match) => {
    stopPolling()
    if (!match) return
    if (match.radiant_gold_adv?.length) {
      parseState.value = 'idle'
      return
    }
    const ageDays = (Date.now() / 1000 - match.start_time) / 86_400
    if (ageDays > REPLAY_EXPIRY_DAYS) {
      parseState.value = 'expired'
      return
    }
    startAutoParse(String(match.match_id))
  },
)

function retryParse() {
  const match = data.value?.match
  if (!match) return
  alreadyRequested.delete(String(match.match_id))
  startAutoParse(String(match.match_id))
}

onBeforeUnmount(stopPolling)

const advantage = computed(() => {
  const m = data.value?.match
  if (!m?.radiant_gold_adv?.length) return null
  return {
    labels: m.radiant_gold_adv.map((_, i) => formatDuration(i * 60)),
    gold: m.radiant_gold_adv,
    xp: m.radiant_xp_adv ?? [],
  }
})

const formatK = (v: number) => `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`

// Per-player timeline card: vyber hráča klikom na ikonu, default prvý Radiant hráč.
const selectedSlot = ref<number | null>(null)
const allPlayers = computed(() => [
  ...radiant.value.map((p) => ({ ...p, isRadiant: true })),
  ...dire.value.map((p) => ({ ...p, isRadiant: false })),
])
const selectedPlayer = computed(() => {
  const slot = selectedSlot.value ?? radiant.value[0]?.player_slot
  return allPlayers.value.find((p) => p.player_slot === slot) ?? null
})
const playerTimeline = computed(() => {
  const p = selectedPlayer.value
  if (!p?.gold_t?.length) return null
  return {
    labels: p.gold_t.map((_, i) => formatDuration(i * 60)),
    gold: p.gold_t,
    xp: p.xp_t ?? [],
  }
})
</script>

<template>
  <section v-if="loading" class="skeleton-stack lg">
    <Skeleton variant="block" height="84px" class="card" />
    <Skeleton variant="block" height="280px" class="card" />
    <Skeleton variant="block" height="280px" class="card" />
  </section>
  <div v-else-if="error" class="error-box">{{ t('matchDetail.errorLoad', { error }) }}</div>

  <template v-else-if="data">
    <Breadcrumb :items="breadcrumbItems" show-back-arrow class="page-breadcrumb" />

    <section class="card match-hero" :class="data.match.radiant_win ? 'radiant' : 'dire'">
      <div class="hero-verdict">
        <TeamGlyph :side="data.match.radiant_win ? 'radiant' : 'dire'" />
        {{ data.match.radiant_win ? 'Radiant' : 'Dire' }} {{ t('matchDetail.victory') }}
      </div>
      <div class="score">
        <span class="side radiant" :class="{ loser: !data.match.radiant_win }">
          {{ data.match.radiant_score }}
        </span>
        <span class="score-sep">—</span>
        <span class="side dire" :class="{ loser: data.match.radiant_win }">
          {{ data.match.dire_score }}
        </span>
      </div>
      <div class="muted hero-meta">
        {{ gameModeName(data.match.game_mode) }} ·
        {{ formatDuration(data.match.duration) }} ·
        {{ formatDate(data.match.start_time, intlLocale) }} ·
        Match {{ data.match.match_id }}
      </div>
    </section>

    <section v-for="team in [
        { name: 'Radiant', players: radiant, won: data.match.radiant_win },
        { name: 'Dire', players: dire, won: !data.match.radiant_win },
      ]" :key="team.name" class="card team" :class="team.name.toLowerCase()">
      <h2 class="team-name">
        <TeamGlyph :side="team.name.toLowerCase() as 'radiant' | 'dire'" />
        {{ team.name }}
        <span v-if="team.won" class="badge win">{{ t('matchDetail.victory') }}</span>
      </h2>
      <div class="table-scroll desktop-table">
        <table class="data">
          <thead>
            <tr>
              <th>Hero</th>
              <th>{{ t('matchDetail.colPlayer') }}</th>
              <th class="num">LVL</th>
              <th>K / D / A</th>
              <th class="num">Net</th>
              <th class="num">GPM / XPM</th>
              <th class="num">LH / DN</th>
              <th class="num">DMG</th>
              <th>{{ t('matchDetail.colItems') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in team.players"
              :key="p.player_slot"
              :class="[team.name.toLowerCase(), { me: p.isMe, mvp: p.isMvp }]"
            >
              <td>
                <HeroIcon :hero="p.hero" :show-name="false" />
              </td>
              <td class="name">
                <RouterLink v-if="p.account_id != null" :to="`/player/${p.account_id}`">
                  {{ p.personaname ?? t('common.playerFallback', { id: p.account_id }) }}
                </RouterLink>
                <span v-else class="muted">{{ t('matchDetail.anonymous') }}</span>
                <span v-if="p.isMvp" class="mvp-tag">★ MVP</span>
              </td>
              <td class="num">{{ p.level }}</td>
              <td class="emphasis">{{ p.kills }} / {{ p.deaths }} / {{ p.assists }}</td>
              <td class="num dim">{{ p.net_worth != null ? formatK(p.net_worth) : '—' }}</td>
              <td class="num emphasis">{{ p.gold_per_min }} / {{ p.xp_per_min }}</td>
              <td class="num dim">{{ p.last_hits }} / {{ p.denies }}</td>
              <td class="num emphasis">{{ formatK(p.hero_damage) }}</td>
              <td>
                <span class="items">
                  <img
                    v-for="(item, i) in p.items"
                    :key="i"
                    :src="itemImageUrl(item)"
                    :alt="item?.dname ?? ''"
                    :title="item?.dname"
                    class="item"
                  />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ul class="mobile-players">
        <li
          v-for="p in team.players"
          :key="p.player_slot"
          class="player-card"
          :class="[team.name.toLowerCase(), { me: p.isMe, mvp: p.isMvp }]"
        >
          <div class="player-card-top">
            <HeroIcon :hero="p.hero" :show-name="false" />
            <span class="player-name">
              <RouterLink v-if="p.account_id != null" :to="`/player/${p.account_id}`">
                {{ p.personaname ?? t('common.playerFallback', { id: p.account_id }) }}
              </RouterLink>
              <span v-else class="muted">{{ t('matchDetail.anonymous') }}</span>
            </span>
            <span v-if="p.isMvp" class="mvp-tag">MVP</span>
          </div>
          <div class="player-card-stats">
            <div class="stat">
              <span class="stat-value">{{ p.level }}</span>
              <span class="stat-label">LVL</span>
            </div>
            <div class="stat emphasis">
              <span class="stat-value">{{ p.kills }} / {{ p.deaths }} / {{ p.assists }}</span>
              <span class="stat-label">K / D / A</span>
            </div>
            <div class="stat dim">
              <span class="stat-value">{{ p.net_worth != null ? formatK(p.net_worth) : '—' }}</span>
              <span class="stat-label">Net</span>
            </div>
            <div class="stat emphasis">
              <span class="stat-value">{{ p.gold_per_min }} / {{ p.xp_per_min }}</span>
              <span class="stat-label">GPM / XPM</span>
            </div>
            <div class="stat dim">
              <span class="stat-value">{{ p.last_hits }} / {{ p.denies }}</span>
              <span class="stat-label">LH / DN</span>
            </div>
            <div class="stat emphasis">
              <span class="stat-value">{{ formatK(p.hero_damage) }}</span>
              <span class="stat-label">DMG</span>
            </div>
          </div>
          <div class="items player-card-items">
            <img
              v-for="(item, i) in p.items"
              :key="i"
              :src="itemImageUrl(item)"
              :alt="item?.dname ?? ''"
              :title="item?.dname"
              class="item"
            />
          </div>
        </li>
      </ul>
    </section>

    <section class="card advantage-card">
      <h2>{{ t('matchDetail.goldXpAdvantage') }}</h2>
      <!-- TODO: Roshan/team-wipe/high-ground event markers need OpenDota objectives/teamfights
           data (not in MatchPlayer/types/opendota.ts today) plus LineChart annotation support. -->
      <LineChart
        v-if="advantage"
        :labels="advantage.labels"
        :datasets="[
          { label: 'Gold', data: advantage.gold, color: cssVar('--gold') },
          { label: 'XP', data: advantage.xp, color: cssVar('--accent') },
        ]"
        :y-format="formatK"
        :height="300"
        :team-split="{
          topLabel: 'Radiant',
          bottomLabel: 'Dire',
          topWash: 'rgba(38, 176, 76, 0.07)',
          bottomWash: 'rgba(224, 82, 79, 0.07)',
          topLabelColor: cssVar('--radiant-strong'),
          bottomLabelColor: cssVar('--dire-strong'),
        }"
      />
      <div v-else class="status-note">
        <template v-if="parseState === 'polling'">
          {{ t('matchDetail.parsePolling') }}
        </template>
        <template v-else-if="parseState === 'gave_up'">
          {{ t('matchDetail.parseGaveUp') }}
          <button class="retry" @click="retryParse">{{ t('matchDetail.parseRetry') }}</button>
        </template>
        <template v-else-if="parseState === 'expired'">
          <i18n-t keypath="matchDetail.parseExpired">
            <template #tag><em>Expose Public Match Data</em></template>
          </i18n-t>
        </template>
        <template v-else>
          {{ t('matchDetail.parseUnavailable') }}
        </template>
      </div>
    </section>

    <section class="card">
      <h2>{{ t('matchDetail.playerTimeline') }}</h2>
      <div class="player-strip">
        <button
          v-for="p in allPlayers"
          :key="p.player_slot"
          type="button"
          class="player-icon"
          :class="[p.isRadiant ? 'radiant' : 'dire', { active: p.player_slot === selectedPlayer?.player_slot }]"
          :aria-label="t('matchDetail.viewPlayerTimeline', { name: p.personaname ?? t('common.playerFallback', { id: p.account_id }) })"
          :aria-pressed="p.player_slot === selectedPlayer?.player_slot"
          @click="selectedSlot = p.player_slot"
        >
          <HeroIcon :hero="p.hero" :show-name="false" />
        </button>
      </div>

      <LineChart
        v-if="playerTimeline"
        :labels="playerTimeline.labels"
        :datasets="[
          { label: 'Gold', data: playerTimeline.gold, color: cssVar('--gold') },
          { label: 'XP', data: playerTimeline.xp, color: cssVar('--accent') },
        ]"
        :y-format="formatK"
        :height="300"
      />
      <div v-else class="status-note">
        <template v-if="parseState === 'polling'">
          {{ t('matchDetail.parsePolling') }}
        </template>
        <template v-else-if="parseState === 'gave_up'">
          {{ t('matchDetail.parseGaveUp') }}
          <button class="retry" @click="retryParse">{{ t('matchDetail.parseRetry') }}</button>
        </template>
        <template v-else-if="parseState === 'expired'">
          <i18n-t keypath="matchDetail.parseExpired">
            <template #tag><em>Expose Public Match Data</em></template>
          </i18n-t>
        </template>
        <template v-else>
          {{ t('matchDetail.parseUnavailable') }}
        </template>
      </div>
    </section>
  </template>
</template>

<style scoped>
.page-breadcrumb {
  padding-left: var(--space-5);
  margin-bottom: var(--space-3);
}

/* Hero section — the page's primary focal point, given more visual weight
   (glow shadow, larger padding) than the team/graph cards below it. */
.match-hero {
  margin-bottom: var(--space-8);
  padding: var(--space-6) var(--space-5);
  text-align: center;
}

.match-hero.radiant { box-shadow: var(--shadow-glow-radiant), var(--shadow-md); }
.match-hero.dire { box-shadow: var(--shadow-glow-dire), var(--shadow-md); }

.hero-verdict {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  font-size: var(--text-md);
  font-weight: var(--weight-bold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  margin-bottom: var(--space-2);
}

.match-hero.radiant .hero-verdict { color: var(--radiant); }
.match-hero.dire .hero-verdict { color: var(--dire); }

/* Score is the page's primary focal point — sized up from the old --text-2xl
   so it reads before the verdict line or any other stat. */
.score {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: var(--weight-bold);
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 0.75rem;
  font-variant-numeric: tabular-nums;
}

.score .side.radiant { color: var(--radiant); }
.score .side.dire { color: var(--dire); }
.score .side.loser { opacity: 0.5; }

/* Glow only the winning side's digits — the losing side stays flat via .loser opacity. */
.score .side.radiant:not(.loser) { text-shadow: 0 0 24px rgba(38, 176, 76, 0.45); }
.score .side.dire:not(.loser) { text-shadow: 0 0 24px rgba(224, 82, 79, 0.45); }

.score-sep { color: var(--muted); }

.hero-meta {
  margin-top: var(--space-3);
}

.team {
  margin-bottom: var(--space-6);
  border-top: 2px solid transparent;
}

.advantage-card {
  margin-bottom: var(--space-6);
}

/* Dota konvencia: Radiant zelená, Dire červená — plus jemný farebný wash panelu,
   nech identita tímu nesedí len na jednom pixelovom pruhu. */
.team.radiant {
  border-top-color: var(--radiant);
  background: var(--radiant-wash), linear-gradient(180deg, rgba(255, 255, 255, 0.015), transparent 40%), var(--surface);
}
.team.dire {
  border-top-color: var(--dire);
  background: var(--dire-wash), linear-gradient(180deg, rgba(255, 255, 255, 0.015), transparent 40%), var(--surface);
}

.team.radiant .team-name { color: var(--radiant); }
.team.dire .team-name { color: var(--dire); }

/* Stronger presence than the plain global .badge.win — a soft glow reinforces
   "this team won" as the one thing in this row that should pop. */
.team.radiant .badge.win { box-shadow: var(--shadow-glow-radiant); }
.team.dire .badge.win { box-shadow: var(--shadow-glow-dire); }

.team h2 {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.table-scroll {
  overflow-x: auto;
}

/* Subtle alternating tint + hover instead of hard row borders. */
tbody tr:nth-child(even) td {
  background: rgba(255, 255, 255, 0.015);
}

tbody tr:hover td {
  background: rgba(255, 255, 255, 0.035);
}

/* MVP = highest hero_damage on the team; independent of "me" identity. */
tr.mvp td:first-child {
  box-shadow: inset 3px 0 0 0 var(--radiant);
}

tr.dire.mvp td:first-child {
  box-shadow: inset 3px 0 0 0 var(--dire);
}

/* Subtle gold tint marks the row as elite — wins over .me's accent tint
   even on your own row, since MVP is the rarer, more notable signal. */
tr.mvp td {
  background: var(--gold-soft);
}

tr.mvp:hover td {
  background: rgba(201, 133, 0, 0.22);
}

.mvp-tag {
  display: inline-block;
  margin-left: var(--space-2);
  padding: 0.05rem var(--space-2);
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-wide);
  color: #1a1200;
  background: var(--gold);
  box-shadow: 0 0 0 1px rgba(201, 133, 0, 0.3), 0 4px 12px -4px rgba(201, 133, 0, 0.5);
  vertical-align: middle;
}

.num.dim,
.stat.dim .stat-value {
  opacity: 0.6;
}

/* K/D/A, GPM/XPM, DMG carry the most scan-value — a touch heavier + brighter
   than the default so the eye lands on them first, without going full bold. */
td.emphasis,
.stat.emphasis .stat-value {
  font-weight: var(--weight-semibold);
  color: var(--ink);
}

/* Mobile card list — hidden by default, swapped in for the table below
   720px so per-player stats read top-to-bottom instead of needing a
   horizontal scroll to see net/gpm/xpm/lh-dn/dmg/items. */
.mobile-players {
  display: none;
}

@media (max-width: 720px) {
  .desktop-table {
    display: none;
  }

  .mobile-players {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    list-style: none;
    padding: 0;
    margin: 0;
  }
}

.player-card {
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.player-card.mvp {
  border-left: 3px solid var(--radiant);
  background: var(--gold-soft);
}

.player-card.dire.mvp {
  border-left-color: var(--dire);
}

.player-card-top {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.player-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-name a {
  color: var(--ink);
}

.player-name a:hover {
  color: var(--accent);
}

.player-card-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.stat-value {
  font-variant-numeric: tabular-nums;
  font-weight: var(--weight-semibold);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

.name {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.name a {
  color: var(--ink);
}

.name a:hover {
  color: var(--accent);
}

.items {
  display: inline-flex;
  gap: var(--space-2);
}

.player-card-items {
  display: flex;
  justify-content: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.item {
  width: 36px;
  height: 27px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  display: block;
  transition: transform var(--duration-fast) var(--ease-out);
}

.item:hover {
  transform: scale(1.15);
  position: relative;
  z-index: 1;
}

.player-strip {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.player-icon {
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0.3rem;
  line-height: 0;
  cursor: pointer;
  transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}

.player-icon.radiant {
  border-color: var(--radiant-soft);
}

.player-icon.dire {
  border-color: var(--dire-soft);
}

.player-icon.radiant.active {
  border-color: var(--radiant);
  box-shadow: var(--shadow-glow-radiant);
}

.player-icon.dire.active {
  border-color: var(--dire);
  box-shadow: var(--shadow-glow-dire);
}

.retry {
  background: var(--accent);
  border: none;
  border-radius: var(--radius-md);
  color: #fff;
  font: inherit;
  font-weight: var(--weight-semibold);
  padding: 0.2rem 0.7rem;
  margin-left: var(--space-2);
  cursor: pointer;
}
</style>
