<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { getPlayer, rankTierName } from '../api/opendota'
import { useAsync } from '../composables/useAsync'
import { useRecentPlayers } from '../composables/useRecentPlayers'
import { useFavorites } from '../composables/useFavorites'

const route = useRoute()
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
    <div class="skeleton avatar" />
    <div class="skeleton skeleton-line" style="width: 220px" />
  </section>
  <div v-else-if="error" class="error-box">Nepodarilo sa načítať hráča: {{ error }}</div>

  <template v-else-if="player">
    <section class="profile card">
      <img v-if="player.profile" :src="player.profile.avatarfull" alt="" class="avatar" />
      <div>
        <h1>
          {{ player.profile?.personaname ?? `Player ${accountId}` }}
          <button
            v-if="player.profile"
            class="star"
            :class="{ active: isFavorite(accountId) }"
            :title="isFavorite(accountId) ? 'Odobrať z obľúbených' : 'Pridať do obľúbených'"
            @click="toggle(player)"
          >
            {{ isFavorite(accountId) ? '★' : '☆' }}
          </button>
        </h1>
        <div class="muted">{{ rankTierName(player.rank_tier) }}</div>
      </div>
      <nav class="tabs">
        <RouterLink :to="`/player/${accountId}`" exact-active-class="active">Overview</RouterLink>
        <RouterLink :to="`/player/${accountId}/matches`" exact-active-class="active">Matches</RouterLink>
        <RouterLink :to="`/player/${accountId}/heroes`" exact-active-class="active">Heroes</RouterLink>
      </nav>
    </section>

    <div v-if="!player.profile" class="status-note">
      Tento profil OpenDota nepozná — skontroluj account ID, alebo hráč nemá
      verejnú match history (<em>Expose Public Match Data</em>).
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

.skeleton-line {
  height: 20px;
  border-radius: var(--radius-sm);
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
