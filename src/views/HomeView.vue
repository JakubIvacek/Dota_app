<script setup lang="ts">
import { computed } from 'vue'
import { ACCOUNT_ID } from '../config'
import { getPlayer, rankTierName } from '../api/opendota'
import { useAsync } from '../composables/useAsync'
import { useRecentPlayers } from '../composables/useRecentPlayers'
import { timeAgo } from '../utils/format'
import SearchBox from '../components/SearchBox.vue'

const { data: me } = useAsync(async () =>
  ACCOUNT_ID ? getPlayer(ACCOUNT_ID) : null,
)

const { recents } = useRecentPlayers()

// Vlastný profil má vlastnú kartu — v histórii ho neduplikuj.
const otherRecents = computed(() =>
  recents.value.filter((r) => r.account_id !== ACCOUNT_ID),
)
</script>

<template>
  <div class="landing">
    <h1>Dota Stats</h1>
    <p class="muted">
      Zadaj meno hráča alebo Dota account ID (Friend Code) a pozri si štatistiky.
    </p>
    <SearchBox size="large" />

    <RouterLink v-if="ACCOUNT_ID" :to="`/player/${ACCOUNT_ID}`" class="card me">
      <img v-if="me?.profile" :src="me.profile.avatarfull" alt="" />
      <div class="me-info">
        <div class="me-label">Môj profil</div>
        <div class="me-name">{{ me?.profile?.personaname ?? `Player ${ACCOUNT_ID}` }}</div>
        <div class="muted" v-if="me">{{ rankTierName(me.rank_tier) }}</div>
      </div>
      <span class="arrow">→</span>
    </RouterLink>

    <section v-if="otherRecents.length" class="recents">
      <h2>Nedávno pozreté</h2>
      <div class="recent-grid">
        <RouterLink
          v-for="r in otherRecents"
          :key="r.account_id"
          :to="`/player/${r.account_id}`"
          class="card recent"
        >
          <img :src="r.avatarfull" alt="" />
          <div>
            <div class="recent-name">{{ r.personaname }}</div>
            <div class="muted small">{{ timeAgo(r.visited_at / 1000) }}</div>
          </div>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.landing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding-top: 9vh;
  text-align: center;
}

.landing h1 {
  font-size: 2.2rem;
}

.me {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
  min-width: min(420px, 90vw);
  color: var(--ink);
  text-align: left;
}

.me:hover {
  border-color: var(--accent);
}

.me img {
  width: 56px;
  height: 56px;
  border-radius: 10px;
}

.me-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
  font-weight: 600;
}

.me-name {
  font-weight: 700;
  font-size: 1.15rem;
}

.arrow {
  margin-left: auto;
  color: var(--accent);
  font-size: 1.3rem;
}

.recents {
  margin-top: 2rem;
  width: 100%;
  max-width: 720px;
}

.recents h2 {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.recent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.6rem;
}

.recent {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.6rem 0.8rem;
  color: var(--ink);
  text-align: left;
}

.recent:hover {
  border-color: var(--accent);
}

.recent img {
  width: 40px;
  height: 40px;
  border-radius: 8px;
}

.recent-name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}

.small {
  font-size: 0.8rem;
}
</style>
