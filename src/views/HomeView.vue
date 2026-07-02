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

.group {
  margin-top: 2rem;
  width: 100%;
  max-width: 720px;
}

.group h2 {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.6rem;
}
</style>
