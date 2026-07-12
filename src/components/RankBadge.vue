<script setup lang="ts">
import { computed } from 'vue'
import { rankTierName } from '../api/opendota'

const props = withDefaults(
  defineProps<{
    rankTier: number | null
    size?: 'sm' | 'lg'
  }>(),
  { size: 'sm' },
)

/** Oficiálne Valve rank assety (medaila + hviezdičkový overlay), vlastná kópia
 * v src/assets/ranks/ — rovnaký zdroj/duch použitia ako OpenDota/Dotabuff:
 * nekomerčný fan-tool s disclaimerom, žiadny hotlink na cudzí CDN. */
const MEDAL_ICONS = import.meta.glob<{ default: string }>('../assets/ranks/rank_icon_*.png', { eager: true })
const STAR_ICONS = import.meta.glob<{ default: string }>('../assets/ranks/rank_star_*.png', { eager: true })

function medalUrl(medal: number): string {
  return MEDAL_ICONS[`../assets/ranks/rank_icon_${medal}.png`]?.default ?? ''
}

function starUrl(stars: number): string {
  return STAR_ICONS[`../assets/ranks/rank_star_${stars}.png`]?.default ?? ''
}

const medal = computed(() => (props.rankTier ? Math.floor(props.rankTier / 10) : 0))
const stars = computed(() => (props.rankTier ? props.rankTier % 10 : 0))
/** Immortal (medaila 8) nemá hviezdy — namiesto toho leaderboard rank. */
const showStars = computed(() => stars.value > 0 && medal.value < 8)
const title = computed(() => rankTierName(props.rankTier))
</script>

<template>
  <span v-if="rankTier" class="rank-badge" :class="size" :title="title" :aria-label="title">
    <img class="medal" :src="medalUrl(medal)" alt="" />
    <img v-if="showStars" class="stars" :src="starUrl(stars)" alt="" />
  </span>
</template>

<style scoped>
.rank-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: -0.25em;
}

.rank-badge.sm {
  width: 1.3em;
  height: 1.3em;
}

.rank-badge.lg {
  width: 56px;
  height: 56px;
  vertical-align: middle;
}

.medal,
.stars {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.medal {
  filter: drop-shadow(0 1px 1px rgba(4, 6, 12, 0.5));
}
</style>
