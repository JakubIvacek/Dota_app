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
import HeroIcon from '../components/HeroIcon.vue'
import LineChart from '../components/LineChart.vue'
import type { MatchPlayer } from '../types/opendota'

const route = useRoute()

// Zvýrazni hráča, z ktorého profilu sme prišli (?player=), inak vlastný.
const highlightId = computed(() => String(route.query.player ?? ACCOUNT_ID))

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
  <p v-if="loading" class="muted">Loading…</p>
  <div v-else-if="error" class="error-box">Nepodarilo sa načítať match: {{ error }}</div>

  <template v-else-if="data">
    <section class="card header">
      <div class="score">
        <span :class="{ winner: data.match.radiant_win }">Radiant {{ data.match.radiant_score }}</span>
        <span class="muted">:</span>
        <span :class="{ winner: !data.match.radiant_win }">{{ data.match.dire_score }} Dire</span>
      </div>
      <div class="muted">
        {{ gameModeName(data.match.game_mode) }} ·
        {{ formatDuration(data.match.duration) }} ·
        {{ formatDate(data.match.start_time) }} ·
        Match {{ data.match.match_id }}
      </div>
    </section>

    <section v-for="team in [
        { name: 'Radiant', players: radiant, won: data.match.radiant_win },
        { name: 'Dire', players: dire, won: !data.match.radiant_win },
      ]" :key="team.name" class="card team">
      <h2>
        {{ team.name }}
        <span v-if="team.won" class="badge win">Victory</span>
      </h2>
      <div class="table-scroll">
        <table class="data">
          <thead>
            <tr>
              <th>Hero</th>
              <th>Player</th>
              <th>LVL</th>
              <th>K / D / A</th>
              <th>Net</th>
              <th>GPM / XPM</th>
              <th>LH / DN</th>
              <th>DMG</th>
              <th>Items</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in team.players" :key="p.player_slot" :class="{ me: p.isMe }">
              <td><HeroIcon :hero="p.hero" :show-name="false" /></td>
              <td class="name">
                <RouterLink v-if="p.account_id != null" :to="`/player/${p.account_id}`">
                  {{ p.personaname ?? `Player ${p.account_id}` }}
                </RouterLink>
                <span v-else class="muted">Anonymous</span>
              </td>
              <td>{{ p.level }}</td>
              <td>{{ p.kills }} / {{ p.deaths }} / {{ p.assists }}</td>
              <td>{{ p.net_worth != null ? formatK(p.net_worth) : '—' }}</td>
              <td>{{ p.gold_per_min }} / {{ p.xp_per_min }}</td>
              <td>{{ p.last_hits }} / {{ p.denies }}</td>
              <td>{{ formatK(p.hero_damage) }}</td>
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
    </section>

    <section class="card">
      <h2>Gold &amp; XP advantage (Radiant +/−)</h2>
      <LineChart
        v-if="advantage"
        :labels="advantage.labels"
        :datasets="[
          { label: 'Gold', data: advantage.gold, color: '#c98500' },
          { label: 'XP', data: advantage.xp, color: '#3987e5' },
        ]"
        :y-format="formatK"
        :height="300"
      />
      <div v-else class="status-note">
        <template v-if="parseState === 'polling'">
          Match nemá sparsovaný replay — parse request je odoslaný na OpenDota.
          Graf sa doplní automaticky, zvyčajne do pár minút (kontrolujem každú minútu…).
        </template>
        <template v-else-if="parseState === 'gave_up'">
          Parse sa zatiaľ nedokončil — OpenDota môže mať dlhšiu frontu.
          <button class="retry" @click="retryParse">Skúsiť znova</button>
        </template>
        <template v-else-if="parseState === 'expired'">
          Replay tohto matchu už expiroval (Valve ich drží ~2–4 týždne), graf sa
          nedá doplniť. Pri čerstvých matchoch ho appka vyžiada automaticky —
          stačí mať zapnuté <em>Expose Public Match Data</em> v Dota klientovi.
        </template>
        <template v-else>
          Tento match nemá sparsovaný replay — graf nie je dostupný.
        </template>
      </div>
    </section>
  </template>
</template>

<style scoped>
.header {
  margin-bottom: 1rem;
  text-align: center;
}

.score {
  font-size: 1.5rem;
  font-weight: 750;
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}

.score .winner {
  color: var(--win);
}

.team {
  margin-bottom: 1rem;
}

.team h2 {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.table-scroll {
  overflow-x: auto;
}

tr.me td {
  background: rgba(57, 135, 229, 0.08);
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

.item {
  width: 30px;
  height: 22px;
  object-fit: cover;
  border-radius: 3px;
  display: block;
}

.retry {
  background: var(--accent);
  border: none;
  border-radius: 6px;
  color: #fff;
  font: inherit;
  font-weight: 600;
  padding: 0.2rem 0.7rem;
  margin-left: 0.5rem;
  cursor: pointer;
}
</style>
