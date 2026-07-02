<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ACCOUNT_ID } from '../config'
import {
  gameModeName,
  getHeroMap,
  getItemMap,
  getMatch,
  isRadiantSlot,
  itemImageUrl,
} from '../api/opendota'
import { useAsync } from '../composables/useAsync'
import { formatDate, formatDuration } from '../utils/format'
import HeroIcon from '../components/HeroIcon.vue'
import LineChart from '../components/LineChart.vue'
import type { MatchPlayer } from '../types/opendota'

const route = useRoute()

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
    isMe: p.account_id != null && String(p.account_id) === ACCOUNT_ID,
  }
}

const radiant = computed(() =>
  (data.value?.match.players ?? []).filter((p) => isRadiantSlot(p.player_slot)).map(playerRow),
)
const dire = computed(() =>
  (data.value?.match.players ?? []).filter((p) => !isRadiantSlot(p.player_slot)).map(playerRow),
)

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
              <td class="name">{{ p.personaname ?? 'Anonymous' }}</td>
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
        Tento match nemá sparsovaný replay — graf nie je dostupný. Detailné dáta
        vyžadujú zapnuté <em>Settings → Advanced Options → Expose Public Match Data</em>
        v Dota klientovi (a chvíľu, kým OpenDota replay spracuje).
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
</style>
