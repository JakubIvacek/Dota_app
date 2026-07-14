<script setup lang="ts">
import { computed } from 'vue'
import logoRadiant from '../assets/logo_radiant.png'
import logoDire from '../assets/logo_dire.png'

const props = defineProps<{
  side: 'radiant' | 'dire'
}>()

const src = computed(() => (props.side === 'radiant' ? logoRadiant : logoDire))
</script>

<template>
  <img :src="src" alt="" class="glyph" />
</template>

<style scoped>
.glyph {
  width: 1.4em;
  height: 1.4em;
  object-fit: contain;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}
</style>
