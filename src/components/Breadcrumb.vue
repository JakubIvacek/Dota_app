<script setup lang="ts">
withDefaults(
  defineProps<{
    items: { label: string; to?: string }[]
    /** Predradí "‹" pred prvú (klikateľnú) položku — vizuálne posilní, že vedie späť. */
    showBackArrow?: boolean
  }>(),
  { showBackArrow: false },
)
</script>

<template>
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <ol class="breadcrumb-list">
      <li v-for="(item, i) in items" :key="item.label" class="breadcrumb-item">
        <RouterLink v-if="item.to" :to="item.to" class="breadcrumb-link">
          <span v-if="i === 0 && showBackArrow" class="breadcrumb-arrow" aria-hidden="true">‹</span>
          <span>{{ item.label }}</span>
        </RouterLink>
        <span v-else class="breadcrumb-current" aria-current="page">{{ item.label }}</span>
        <span v-if="i < items.length - 1" class="breadcrumb-sep" aria-hidden="true">/</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumb-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: var(--text-sm);
}

.breadcrumb-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.breadcrumb-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  color: var(--ink-2);
  font-weight: var(--weight-medium);
  transition: color var(--duration-fast) var(--ease-out);
}

.breadcrumb-link:hover {
  color: var(--accent);
  text-decoration: underline;
}

.breadcrumb-arrow {
  font-weight: var(--weight-bold);
}

.breadcrumb-sep {
  color: var(--muted);
  opacity: 0.6;
}

.breadcrumb-current {
  color: var(--ink);
  font-weight: var(--weight-semibold);
}
</style>
