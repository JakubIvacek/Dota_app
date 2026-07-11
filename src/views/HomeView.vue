<script setup lang="ts">
import { computed } from 'vue'
import { ACCOUNT_ID } from '../config'
import { getPlayer, rankTierName } from '../api/opendota'
import { useAsync } from '../composables/useAsync'
import { useRecentPlayers } from '../composables/useRecentPlayers'
import { useFavorites } from '../composables/useFavorites'
import { timeAgo } from '../utils/format'
import SearchBox from '../components/SearchBox.vue'
import PlayerLinkCard from '../components/PlayerLinkCard.vue'

const { data: me } = useAsync(async () =>
  ACCOUNT_ID ? getPlayer(ACCOUNT_ID) : null,
)

const { recents } = useRecentPlayers()
const { favorites, isFavorite } = useFavorites()

const shownFavorites = computed(() =>
  favorites.value.filter((f) => f.account_id !== ACCOUNT_ID),
)

// Vlastný profil má vlastnú kartu a obľúbení vlastnú sekciu — v histórii nedupluj.
const shownRecents = computed(() =>
  recents.value.filter((r) => r.account_id !== ACCOUNT_ID && !isFavorite(r.account_id)),
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

    <section v-if="shownFavorites.length" class="group">
      <h2>★ Obľúbení</h2>
      <div class="grid">
        <PlayerLinkCard
          v-for="f in shownFavorites"
          :key="f.account_id"
          :account-id="f.account_id"
          :personaname="f.personaname"
          :avatarfull="f.avatarfull"
        />
      </div>
    </section>

    <section v-if="shownRecents.length" class="group">
      <h2>Nedávno pozreté</h2>
      <div class="grid">
        <PlayerLinkCard
          v-for="r in shownRecents"
          :key="r.account_id"
          :account-id="r.account_id"
          :personaname="r.personaname"
          :avatarfull="r.avatarfull"
          :sub="timeAgo(r.visited_at / 1000)"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.landing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding-top: 9vh;
  text-align: center;
}

.landing h1 {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  letter-spacing: var(--tracking-tight);
  background: linear-gradient(180deg, #fff, #b9bec7);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.me {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-top: var(--space-6);
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
  border-radius: var(--radius-lg);
}

.me-label {
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--muted);
  font-weight: var(--weight-semibold);
}

.me-name {
  font-family: var(--font-display);
  font-weight: var(--weight-bold);
  font-size: 1.15rem;
}

.arrow {
  margin-left: auto;
  color: var(--accent);
  font-size: 1.3rem;
}

.group {
  margin-top: var(--space-8);
  width: 100%;
  max-width: 720px;
}

.group h2 {
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--muted);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-3);
}
</style>
