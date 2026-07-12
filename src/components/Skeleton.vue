<script setup lang="ts">
/** Jeden skeleton blok — tvar podľa variant, veľkosť podľa obsahu, ktorý nahrádza.
 * Nahrádza kopírované .skeleton-row/.skeleton-line/... bloky v jednotlivých views. */
withDefaults(
  defineProps<{
    variant?: 'row' | 'line' | 'avatar' | 'block'
    height?: string
    width?: string
  }>(),
  { variant: 'row' },
)
</script>

<template>
  <div class="skeleton" :class="variant" :style="{ height, width }" />
</template>

<style scoped>
.row {
  height: 40px;
  border-radius: var(--radius-md);
}

.line {
  height: 20px;
  width: 60%;
  border-radius: var(--radius-sm);
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}

.block {
  height: 100%;
  border-radius: var(--radius-lg);
}
</style>
