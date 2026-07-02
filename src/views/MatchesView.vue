<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ACCOUNT_ID } from '../config'
import { gameModeName, getHeroMap, getMatches, wonMatch } from '../api/opendota'
import { useAsync } from '../composables/useAsync'
import { formatDuration, timeAgo } from '../utils/format'
import HeroIcon from '../components/HeroIcon.vue'

const router = useRouter()

const { data, loading, error } = useAsync(async () => {
  const [matches, heroMap] = await Promise.all([getMatches(ACCOUNT_ID, 50), getHeroMap()])
  return { matches, heroMap }
})

const rows = computed(() =>
  (data.value?.matches ?? []).map((m) => ({
    ...m,
    hero: data.value?.heroMap.get(m.hero_id),
    won: wonMatch(m),
  })),
)
</script>

<template>
  <h1>Posledné matche</h1>

  <p v-if="loading" class="muted">Loading…</p>
  <div v-else-if="error" class="error-box">Nepodarilo sa načítať matche: {{ error }}</div>

  <div v-else class="card">
    <table class="data">
      <thead>
        <tr>
          <th>Hero</th>
          <th>Result</th>
          <th>K / D / A</th>
          <th>Duration</th>
          <th>Mode</th>
          <th>Played</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="m in rows"
          :key="m.match_id"
          class="clickable"
          @click="router.push(`/matches/${m.match_id}`)"
        >
          <td><HeroIcon :hero="m.hero" /></td>
          <td>
            <span class="badge" :class="m.won ? 'win' : 'loss'">{{ m.won ? 'W' : 'L' }}</span>
          </td>
          <td>{{ m.kills }} / {{ m.deaths }} / {{ m.assists }}</td>
          <td>{{ formatDuration(m.duration) }}</td>
          <td>{{ gameModeName(m.game_mode) }}</td>
          <td class="muted">{{ timeAgo(m.start_time) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
