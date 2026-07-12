<script setup lang="ts">
import { useAppLocale } from '../composables/useAppLocale'
import { useRecentPlayers } from '../composables/useRecentPlayers'
import { useFavorites } from '../composables/useFavorites'
import { useSteamNews } from '../composables/useSteamNews'
import { timeAgo, formatDate } from '../utils/format'
import { newsExcerpt } from '../utils/steamContent'
import SearchBox from '../components/SearchBox.vue'
import PlayerLinkCard from '../components/PlayerLinkCard.vue'
import ProductTour from '../components/ProductTour.vue'

const { t, intlLocale } = useAppLocale()

const { recents } = useRecentPlayers()
const { favorites } = useFavorites()
const { data: newsItems, loading: newsLoading } = useSteamNews()

/** Homepage only teases the 3 most recent — the full list lives on /updates. */
const MAX_UPDATES_SHOWN = 3

/** Desktop shows a max of 4 — older visits live in localStorage, not on the landing page. */
const MAX_RECENTS_SHOWN = 4
</script>

<template>
  <div class="landing">
    <div class="glow" aria-hidden="true" />
    <span class="eyebrow">{{ t('home.eyebrow') }}</span>
    <h1>{{ t('home.heading') }}</h1>
    <p class="muted lede">
      {{ t('home.tagline') }}
    </p>
    <p class="muted updates-note">{{ t('home.viewUpdates') }}</p>
    <SearchBox />

    <section class="group">
      <h2>
        <svg class="star-icon" viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M10 1.6l2.47 5.24 5.78.68-4.28 4.02 1.15 5.72L10 14.4l-5.12 2.86 1.15-5.72L1.75 7.52l5.78-.68L10 1.6z"
            fill="currentColor"
          />
        </svg>
        {{ t('home.favorites') }}
      </h2>
      <div v-if="favorites.length" class="grid">
        <PlayerLinkCard
          v-for="(f, i) in favorites"
          :key="f.account_id"
          :account-id="f.account_id"
          :personaname="f.personaname"
          :avatarfull="f.avatarfull"
          :style="{ animationDelay: `${Math.min(i, 8) * 40}ms` }"
        />
      </div>
      <p v-else class="muted empty-note">{{ t('home.favoritesEmpty') }}</p>
    </section>

    <section class="group">
      <h2>{{ t('home.recentlyViewed') }}</h2>
      <div v-if="recents.length" class="grid">
        <PlayerLinkCard
          v-for="(r, i) in recents.slice(0, MAX_RECENTS_SHOWN)"
          :key="r.account_id"
          :account-id="r.account_id"
          :personaname="r.personaname"
          :avatarfull="r.avatarfull"
          :sub="timeAgo(r.visited_at / 1000, intlLocale)"
          :style="{ animationDelay: `${Math.min(i, 8) * 40}ms` }"
        />
      </div>
      <p v-else class="muted empty-note">{{ t('home.recentlyViewedEmpty') }}</p>
    </section>

    <section class="group">
      <div class="group-header">
        <h2>{{ t('home.latestUpdates') }}</h2>
        <RouterLink to="/updates" class="show-all-link">{{ t('home.showAllUpdates') }} →</RouterLink>
      </div>
      <ul v-if="newsItems?.length" class="updates-list">
        <li v-for="item in newsItems.slice(0, MAX_UPDATES_SHOWN)" :key="item.gid" class="card update-entry">
          <RouterLink to="/updates" class="update-title">{{ item.title }}</RouterLink>
          <div class="muted update-date">{{ formatDate(item.date, intlLocale) }}</div>
          <p class="update-excerpt">{{ newsExcerpt(item.contents, 140) }}</p>
          <a :href="item.url" target="_blank" rel="noopener" class="update-link">{{ t('updates.readMore') }} →</a>
        </li>
      </ul>
      <p v-else-if="!newsLoading" class="muted empty-note">{{ t('home.latestUpdatesEmpty') }}</p>
    </section>

    <ProductTour />
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
  overflow-x: hidden;
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

.updates-note {
  font-size: var(--text-sm);
  margin-top: calc(-1 * var(--space-2));
}

.group {
  margin-top: var(--space-8);
  width: 100%;
  max-width: 980px;
  text-align: left;
}

.group h2 {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--muted);
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.show-all-link {
  font-size: var(--text-sm);
  color: var(--accent);
  white-space: nowrap;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.show-all-link:hover {
  opacity: 0.8;
}

.star-icon {
  width: 13px;
  height: 13px;
  color: var(--gold);
}

.empty-note {
  margin-top: var(--space-2);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: var(--space-3);
}

.grid :deep(.player-link) {
  animation: card-in var(--duration-normal) var(--ease-out) both;
}

.updates-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-3);
  list-style: none;
  padding: 0;
  margin: 0;
}

.update-entry {
  padding: var(--space-3) var(--space-4);
}

.update-title {
  font-weight: var(--weight-semibold);
  color: var(--ink);
}

.update-title:hover {
  color: var(--accent);
}

.update-date {
  font-size: var(--text-sm);
  margin-top: 0.15rem;
}

.update-excerpt {
  margin-top: var(--space-2);
  color: var(--ink-2);
  font-size: var(--text-sm);
}

.update-link {
  display: inline-block;
  margin-top: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--accent);
}

.update-link:hover {
  text-decoration: underline;
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
