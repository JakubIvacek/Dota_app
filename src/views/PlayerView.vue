<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { getPlayer, rankTierName } from '../api/opendota'
import { useAsync } from '../composables/useAsync'
import { useRecentPlayers } from '../composables/useRecentPlayers'
import { useFavorites } from '../composables/useFavorites'
import { useAppLocale } from '../composables/useAppLocale'
import Skeleton from '../components/Skeleton.vue'
import RankBadge from '../components/RankBadge.vue'

const route = useRoute()
const { t } = useAppLocale()
const accountId = computed(() => String(route.params.accountId))

const { data: player, loading, error } = useAsync(() => getPlayer(accountId.value))

const { record } = useRecentPlayers()
watchEffect(() => {
  if (player.value) record(player.value)
})

const { isFavorite, toggle } = useFavorites()
</script>

<template>
  <section v-if="loading" class="card profile skeleton-profile">
    <Skeleton variant="avatar" width="64px" height="64px" />
    <Skeleton variant="line" width="220px" />
  </section>
  <div v-else-if="error" class="error-box">{{ t('player.errorLoad', { error }) }}</div>

  <template v-else-if="player">
    <section class="profile card">
      <img v-if="player.profile" :src="player.profile.avatarfull" alt="" class="avatar" />
      <RankBadge :rank-tier="player.rank_tier" size="lg" />
      <div>
        <h1>
          {{ player.profile?.personaname ?? t('common.playerFallback', { id: accountId }) }}
          <button
            v-if="player.profile"
            class="star"
            :class="{ active: isFavorite(accountId) }"
            :title="isFavorite(accountId) ? t('player.removeFavorite') : t('player.addFavorite')"
            @click="toggle(player)"
          >
            {{ isFavorite(accountId) ? '★' : '☆' }}
          </button>
        </h1>
        <div class="muted">{{ rankTierName(player.rank_tier) }}</div>
      </div>
      <nav class="tabs">
        <RouterLink :to="`/player/${accountId}`" exact-active-class="active">{{ t('player.tabOverview') }}</RouterLink>
        <RouterLink :to="`/player/${accountId}/matches`" exact-active-class="active">{{ t('player.tabMatches') }}</RouterLink>
        <RouterLink :to="`/player/${accountId}/heroes`" exact-active-class="active">{{ t('player.tabHeroes') }}</RouterLink>
      </nav>
    </section>

    <div v-if="!player.profile" class="status-note">
      <i18n-t keypath="player.unknownProfile">
        <template #tag><em>Expose Public Match Data</em></template>
      </i18n-t>
    </div>

    <RouterView v-else />
  </template>
</template>

<style scoped>
.profile {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.skeleton-profile.profile {
  margin-bottom: var(--space-4);
}

.tabs {
  margin-left: auto;
  display: flex;
  gap: 0.4rem;
}

.tabs a {
  color: var(--ink-2);
  font-weight: var(--weight-medium);
  padding: 0.35rem 0.8rem;
  border-radius: var(--radius-md);
  transition: background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out);
}

.tabs a:hover {
  background: var(--surface-2);
}

.tabs a.active {
  background: var(--accent-soft);
  color: var(--accent);
}

@media (max-width: 720px) {
  .tabs {
    margin-left: 0;
    flex-basis: 100%;
    justify-content: center;
  }
}

.star {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0 0.2rem;
  vertical-align: 2px;
}

.star:hover {
  color: var(--gold);
}

.star.active {
  color: var(--gold);
}
</style>
