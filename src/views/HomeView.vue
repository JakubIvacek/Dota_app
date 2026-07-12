<script setup lang="ts">
import { computed } from 'vue'
import { ACCOUNT_ID } from '../config'
import { useAppLocale } from '../composables/useAppLocale'
import { getPlayer, rankTierName } from '../api/opendota'
import { useAsync } from '../composables/useAsync'
import { useRecentPlayers } from '../composables/useRecentPlayers'
import { useFavorites } from '../composables/useFavorites'
import { timeAgo } from '../utils/format'
import SearchBox from '../components/SearchBox.vue'
import PlayerLinkCard from '../components/PlayerLinkCard.vue'
import RankBadge from '../components/RankBadge.vue'
import Skeleton from '../components/Skeleton.vue'

const { t, intlLocale } = useAppLocale()

const { data: me, loading: meLoading } = useAsync(async () =>
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
    <div class="glow" aria-hidden="true" />
    <span class="eyebrow">{{ t('home.eyebrow') }}</span>
    <h1>Dota Stats</h1>
    <p class="muted lede">
      {{ t('home.tagline') }}
    </p>
    <SearchBox size="large" />

    <div v-if="ACCOUNT_ID && meLoading" class="card me skeleton-me">
      <Skeleton variant="avatar" width="56px" height="56px" />
      <div class="me-info">
        <Skeleton variant="line" width="80px" height="11px" />
        <Skeleton variant="line" width="150px" />
      </div>
    </div>
    <RouterLink v-else-if="ACCOUNT_ID" :to="`/player/${ACCOUNT_ID}`" class="card card--interactive me">
      <img v-if="me?.profile" :src="me.profile.avatarfull" alt="" />
      <div class="me-info">
        <div class="me-label">{{ t('home.myProfile') }}</div>
        <div class="me-name">{{ me?.profile?.personaname ?? t('common.playerFallback', { id: ACCOUNT_ID }) }}</div>
        <div class="muted rank-line" v-if="me">
          <RankBadge :rank-tier="me.rank_tier" />
          {{ rankTierName(me.rank_tier) }}
        </div>
      </div>
      <span class="arrow">→</span>
    </RouterLink>

    <section v-if="shownFavorites.length" class="group">
      <h2>{{ t('home.favorites') }}</h2>
      <div class="grid">
        <PlayerLinkCard
          v-for="(f, i) in shownFavorites"
          :key="f.account_id"
          :account-id="f.account_id"
          :personaname="f.personaname"
          :avatarfull="f.avatarfull"
          :style="{ animationDelay: `${Math.min(i, 8) * 40}ms` }"
        />
      </div>
    </section>

    <section v-if="shownRecents.length" class="group">
      <h2>{{ t('home.recentlyViewed') }}</h2>
      <div class="grid">
        <PlayerLinkCard
          v-for="(r, i) in shownRecents"
          :key="r.account_id"
          :account-id="r.account_id"
          :personaname="r.personaname"
          :avatarfull="r.avatarfull"
          :sub="timeAgo(r.visited_at / 1000, intlLocale)"
          :style="{ animationDelay: `${Math.min(i, 8) * 40}ms` }"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.landing {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding-top: 8vh;
  padding-bottom: var(--space-8);
  text-align: center;
}

/* Ambient glow anchored behind the hero — gives the landing screen a focal
   point instead of flat text floating on an empty page. */
.glow {
  position: absolute;
  top: -6vh;
  left: 50%;
  width: min(900px, 140vw);
  height: 420px;
  transform: translateX(-50%);
  background: radial-gradient(closest-side, rgba(57, 135, 229, 0.16), rgba(57, 135, 229, 0.04) 55%, transparent 75%);
  filter: blur(10px);
  pointer-events: none;
  z-index: -1;
}

.landing h1 {
  font-family: var(--font-display);
  font-size: clamp(2.4rem, 5vw + 1rem, var(--text-2xl));
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-tight);
  line-height: 1.05;
  background: linear-gradient(160deg, #fff 20%, #b9bec7 75%, var(--accent) 130%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.landing .lede {
  max-width: 34rem;
}

.me {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-top: var(--space-2);
  min-width: min(440px, 90vw);
  color: var(--ink);
  text-align: left;
  box-shadow: var(--shadow-glow-accent);
}

.me img {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.skeleton-me .me-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
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

.rank-line {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.arrow {
  margin-left: auto;
  color: var(--accent);
  font-size: 1.3rem;
}

.group {
  margin-top: var(--space-8);
  width: 100%;
  max-width: 760px;
  text-align: left;
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

.grid :deep(.player-link) {
  animation: card-in var(--duration-normal) var(--ease-out) both;
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .grid :deep(.player-link) {
    animation: none;
  }
}
</style>
