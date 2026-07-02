<script setup lang="ts">
defineProps<{
  label: string
  value: string
  sub?: string
}>()
</script>

<template>
  <div class="card stat">
    <div class="label">{{ label }}</div>
    <div class="value">{{ value }}</div>
    <div v-if="sub" class="sub">{{ sub }}</div>
  </div>
</template>

<style scoped>
.stat {
  padding: 0.85rem 1.1rem;
}

.label {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
  font-weight: 600;
}

.value {
  font-size: 1.7rem;
  font-weight: 700;
  line-height: 1.25;
}

.sub {
  font-size: 0.82rem;
  color: var(--ink-2);
}
</style>
