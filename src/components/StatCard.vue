<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value: string
    sub?: string
    /** Farba hodnoty — win/loss nesie informáciu (nad/pod 50 %…), default je neutrálna. */
    tone?: 'default' | 'win' | 'loss' | 'accent'
  }>(),
  { tone: 'default' },
)
</script>

<template>
  <div class="card stat">
    <div class="label">{{ label }}</div>
    <div class="value" :class="tone">{{ value }}</div>
    <div v-if="sub" class="sub">{{ sub }}</div>
  </div>
</template>

<style scoped>
.stat {
  padding: 0.85rem 1.1rem;
}

.label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--muted);
  font-weight: 600;
}

.value {
  font-size: 1.7rem;
  font-weight: 700;
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
}

.value.win { color: var(--win); }
.value.loss { color: var(--loss); }
.value.accent { color: var(--accent); }

.sub {
  font-size: 0.82rem;
  color: var(--ink-2);
}
</style>
