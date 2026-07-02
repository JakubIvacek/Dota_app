<script setup lang="ts">
import { useRoute } from 'vue-router'
import { searchPlayers } from '../api/opendota'
import { useAsync } from '../composables/useAsync'
import { timeAgo } from '../utils/format'

const route = useRoute()

const { data: results, loading, error } = useAsync(() =>
  searchPlayers(String(route.query.q ?? '')),
)
</script>

<template>
  <h1>Výsledky pre „{{ route.query.q }}“</h1>

  <p v-if="loading" class="muted">Searching…</p>
  <div v-else-if="error" class="error-box">Search zlyhal: {{ error }}</div>
  <p v-else-if="!results?.length" class="muted">Žiadny hráč sa nenašiel.</p>

  <div v-else class="card">
    <RouterLink
      v-for="r in results.slice(0, 20)"
      :key="r.account_id"
      :to="`/player/${r.account_id}`"
      class="result"
    >
      <img :src="r.avatarfull" alt="" />
      <span class="name">{{ r.personaname }}</span>
      <span class="muted meta">
        ID {{ r.account_id }}
        <template v-if="r.last_match_time"> · last match {{ timeAgo(Date.parse(r.last_match_time) / 1000) }}</template>
      </span>
    </RouterLink>
  </div>
</template>

<style scoped>
.card {
  padding: 0.4rem;
}

.result {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.5rem 0.8rem;
  border-radius: 8px;
  color: var(--ink);
}

.result:hover {
  background: var(--surface-2);
}

.result img {
  width: 40px;
  height: 40px;
  border-radius: 8px;
}

.name {
  font-weight: 600;
}

.meta {
  font-size: 0.85rem;
}
</style>
