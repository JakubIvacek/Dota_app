<script setup lang="ts">
/** Radiant/Dire dostávajú vlastný tvar, nie len farbu — trojuholník hore/dole
 * odkazuje na pozíciu základní na mape (Radiant dole-vľavo stúpa, Dire hore-vpravo klesá). */
defineProps<{
  side: 'radiant' | 'dire'
}>()
</script>

<template>
  <svg class="glyph" :class="side" viewBox="0 0 12 12" aria-hidden="true">
    <path v-if="side === 'radiant'" d="M6 1.5 L10.5 9.5 L1.5 9.5 Z" />
    <path v-else d="M1.5 2.5 L10.5 2.5 L6 10.5 Z" />
  </svg>
</template>

<style scoped>
.glyph {
  width: 0.65em;
  height: 0.65em;
  flex-shrink: 0;
}

.glyph.radiant path { fill: var(--radiant); }
.glyph.dire path { fill: var(--dire); }
</style>
