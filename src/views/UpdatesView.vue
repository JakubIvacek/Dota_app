<script setup lang="ts">
import { useAppLocale } from '../composables/useAppLocale'
import { useSteamNews } from '../composables/useSteamNews'
import { formatDate } from '../utils/format'
import { newsExcerpt } from '../utils/steamContent'
import Skeleton from '../components/Skeleton.vue'

const { t, intlLocale } = useAppLocale()
const { data, loading, error } = useSteamNews()
</script>

<template>
  <div class="updates">
    <h1>{{ t('updates.title') }}</h1>
    <p class="muted lede">{{ t('updates.subtitle') }}</p>

    <section v-if="loading" class="card skeleton-stack">
      <Skeleton v-for="i in 6" :key="i" variant="row" height="64px" />
    </section>
    <div v-else-if="error" class="error-box">{{ t('updates.errorLoad', { error }) }}</div>
    <p v-else-if="!data?.length" class="muted empty-note">{{ t('updates.empty') }}</p>

    <ul v-else class="list">
      <li v-for="item in data" :key="item.gid" class="card entry">
        <a :href="item.url" target="_blank" rel="noopener" class="entry-title">{{ item.title }}</a>
        <div class="muted entry-date">{{ formatDate(item.date, intlLocale) }}</div>
        <p class="entry-excerpt">{{ newsExcerpt(item.contents) }}</p>
        <a :href="item.url" target="_blank" rel="noopener" class="entry-link">{{ t('updates.readMore') }} →</a>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.updates {
  max-width: 760px;
  margin: 0 auto;
}

.lede {
  margin-bottom: var(--space-6);
}

.skeleton-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  list-style: none;
  padding: 0;
  margin: 0;
}

.entry {
  padding: var(--space-4);
}

.entry-title {
  font-weight: var(--weight-semibold);
  color: var(--ink);
}

.entry-title:hover {
  color: var(--accent);
}

.entry-date {
  font-size: var(--text-sm);
  margin-top: 0.15rem;
}

.entry-excerpt {
  margin-top: var(--space-2);
  color: var(--ink-2);
}

.entry-link {
  display: inline-block;
  margin-top: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--accent);
}

.entry-link:hover {
  text-decoration: underline;
}

.empty-note {
  margin-top: var(--space-2);
}
</style>
