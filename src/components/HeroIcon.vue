<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { heroImageUrl } from '../api/opendota'
import type { HeroConstant } from '../types/opendota'

withDefaults(
  defineProps<{
    hero?: HeroConstant
    showName?: boolean
  }>(),
  { showName: true },
)

const { t } = useI18n()
</script>

<template>
  <span class="hero">
    <img v-if="hero" :src="heroImageUrl(hero)" :alt="hero.localized_name" class="portrait" />
    <span v-if="showName">{{ hero?.localized_name ?? t('common.unknown') }}</span>
  </span>
</template>

<style scoped>
.hero {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  white-space: nowrap;
}

.portrait {
  width: 42px;
  height: 24px;
  object-fit: cover;
  border-radius: 4px;
  display: block;
}
</style>
