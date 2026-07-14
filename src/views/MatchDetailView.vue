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

const radiant = computed(() =>
  (data.value?.match.players ?? []).filter((p) => isRadiantSlot(p.player_slot)).map(playerRow),
)
const dire = computed(() =>
  (data.value?.match.players ?? []).filter((p) => !isRadiantSlot(p.player_slot)).map(playerRow),
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
    labels: m.radiant_gold_adv.map((_, i) => `${i}'`),
    gold: m.radiant_gold_adv,
    xp: m.radiant_xp_adv ?? [],
  }
})

const formatK = (v: number) => `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`
</script>

<template>
  <section v-if="loading" class="skeleton-stack lg">
    <Skeleton variant="block" height="84px" class="card" />
    <Skeleton variant="block" height="280px" class="card" />
    <Skeleton variant="block" height="280px" class="card" />
  </section>
  <div v-else-if="error" class="error-box">{{ t('matchDetail.errorLoad', { error }) }}</div>

  <template v-else-if="data">
    <section class="card header">
      <div class="header-back">
        <RouterLink :to="backTarget" class="back-link">‹ {{ t('matchDetail.back') }}</RouterLink>
      </div>
      <div class="score">
        <span class="side radiant" :class="{ loser: !data.match.radiant_win }">
          <TeamGlyph side="radiant" />Radiant {{ data.match.radiant_score }}
        </span>
        <span class="muted">:</span>
        <span class="side dire" :class="{ loser: data.match.radiant_win }">
          {{ data.match.dire_score }} Dire<TeamGlyph side="dire" />
        </span>
      </div>
      <div class="muted">
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
            <tr v-for="p in team.players" :key="p.player_slot" :class="{ me: p.isMe }">
              <td><HeroIcon :hero="p.hero" :show-name="false" /></td>
              <td class="name">
                <RouterLink v-if="p.account_id != null" :to="`/player/${p.account_id}`">
                  {{ p.personaname ?? t('common.playerFallback', { id: p.account_id }) }}
                </RouterLink>
                <span v-else class="muted">{{ t('matchDetail.anonymous') }}</span>
              </td>
              <td class="num">{{ p.level }}</td>
              <td>{{ p.kills }} / {{ p.deaths }} / {{ p.assists }}</td>
              <td class="num">{{ p.net_worth != null ? formatK(p.net_worth) : '—' }}</td>
              <td class="num">{{ p.gold_per_min }} / {{ p.xp_per_min }}</td>
              <td class="num">{{ p.last_hits }} / {{ p.denies }}</td>
              <td class="num">{{ formatK(p.hero_damage) }}</td>
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
        <li v-for="p in team.players" :key="p.player_slot" class="player-card" :class="{ me: p.isMe }">
          <div class="player-card-top">
            <HeroIcon :hero="p.hero" :show-name="false" />
            <span class="player-name">
              <RouterLink v-if="p.account_id != null" :to="`/player/${p.account_id}`">
                {{ p.personaname ?? t('common.playerFallback', { id: p.account_id }) }}
              </RouterLink>
              <span v-else class="muted">{{ t('matchDetail.anonymous') }}</span>
            </span>
          </div>
          <div class="player-card-stats">
            <div class="stat">
              <span class="stat-value">{{ p.level }}</span>
              <span class="stat-label">LVL</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ p.kills }} / {{ p.deaths }} / {{ p.assists }}</span>
              <span class="stat-label">K / D / A</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ p.net_worth != null ? formatK(p.net_worth) : '—' }}</span>
              <span class="stat-label">Net</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ p.gold_per_min }} / {{ p.xp_per_min }}</span>
              <span class="stat-label">GPM / XPM</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ p.last_hits }} / {{ p.denies }}</span>
              <span class="stat-label">LH / DN</span>
            </div>
            <div class="stat">
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

    <section class="card">
      <h2>{{ t('matchDetail.goldXpAdvantage') }}</h2>
      <LineChart
        v-if="advantage"
        :labels="advantage.labels"
        :datasets="[
          { label: 'Gold', data: advantage.gold, color: cssVar('--gold') },
          { label: 'XP', data: advantage.xp, color: cssVar('--accent') },
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
.header {
  margin-bottom: var(--space-4);
  text-align: center;
}

.header-back {
  text-align: left;
  margin-bottom: var(--space-3);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  color: var(--ink-2);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  transition: color var(--duration-fast) var(--ease-out);
}

.back-link:hover {
  color: var(--accent);
}

.score {
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}

.score .side {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
}

.score .side.radiant { color: var(--radiant); }
.score .side.dire { color: var(--dire); flex-direction: row-reverse; }
.score .side.loser { opacity: 0.5; }

.team {
  margin-bottom: var(--space-4);
  border-top: 2px solid transparent;
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

.team h2 {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.table-scroll {
  overflow-x: auto;
}

tr.me td {
  background: var(--accent-soft);
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

.player-card.me {
  background: var(--accent-soft);
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
  gap: 2px;
}

.player-card-items {
  display: flex;
  justify-content: center;
  margin-top: var(--space-3);
}

.item {
  width: 30px;
  height: 22px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  display: block;
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
