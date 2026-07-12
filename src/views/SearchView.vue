<script setup lang="ts">
import { useRoute } from 'vue-router'
import { searchPlayers } from '../api/opendota'
import { useAsync } from '../composables/useAsync'
import { timeAgo } from '../utils/format'
import { useAppLocale } from '../composables/useAppLocale'

const route = useRoute()
const { t, intlLocale } = useAppLocale()

const { data: results, loading, error } = useAsync(() =>
  searchPlayers(String(route.query.q ?? '')),
)
</script>

<template>
  <h1>{{ t('search.resultsFor', { query: route.query.q }) }}</h1>

  <section v-if="loading" class="card skeleton-results">
    <div v-for="i in 6" :key="i" class="skeleton skeleton-row" />
  </section>
  <div v-else-if="error" class="error-box">{{ t('search.errorLoad', { error }) }}</div>
  <p v-else-if="!results?.length" class="muted">{{ t('search.noResults') }}</p>

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
        {{ t('search.idLabel', { id: r.account_id }) }}
        <template v-if="r.last_match_time"> · {{ t('search.lastMatch', { time: timeAgo(Date.parse(r.last_match_time) / 1000, intlLocale) }) }}</template>
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
  border-radius: var(--radius-md);
  color: var(--ink);
  transition: background var(--duration-fast) var(--ease-out);
}

.result:hover,
.result:focus-visible {
  background: var(--surface-2);
}

.skeleton-results {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: 0.4rem;
}

.skeleton-row {
  height: 56px;
  border-radius: var(--radius-md);
}

.result img {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
}

.name {
  font-weight: var(--weight-semibold);
}

.meta {
  font-size: 0.85rem;
}
</style>
