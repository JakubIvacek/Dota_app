<script setup lang="ts">
import RankBadge from './RankBadge.vue'

defineProps<{
  accountId: string
  personaname: string
  avatarfull: string
  sub?: string
  rankTier?: number | null
}>()
</script>

<template>
  <RouterLink :to="`/player/${accountId}`" class="card card--interactive player-link">
    <img :src="avatarfull" :alt="personaname" />
    <div class="player-info">
      <div class="player-name">
        <RankBadge v-if="rankTier" :rank-tier="rankTier" />
        {{ personaname }}
      </div>
      <div v-if="sub" class="muted small">{{ sub }}</div>
    </div>
    <span class="chevron" aria-hidden="true">→</span>
  </RouterLink>
</template>

<style scoped>
.player-link {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.6rem 0.8rem;
  color: var(--ink);
  text-align: left;
}

.player-info {
  min-width: 0;
  flex: 1;
}

.chevron {
  flex-shrink: 0;
  color: var(--muted);
  transition: color var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
}

.player-link:hover .chevron,
.player-link:focus-visible .chevron {
  color: var(--accent);
  transform: translateX(2px);
}

@media (prefers-reduced-motion: reduce) {
  .chevron {
    transition: none;
  }
}

.player-link img {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
}

.player-name {
  font-weight: var(--weight-semibold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}

.small {
  font-size: 0.8rem;
}
</style>
