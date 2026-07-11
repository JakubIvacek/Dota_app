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
  padding: var(--space-3) var(--space-5);
}

.label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-eyebrow);
  color: var(--muted);
  font-weight: var(--weight-semibold);
}

.value {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-tight);
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
}

.value.win { color: var(--win); }
.value.loss { color: var(--loss); }
.value.accent { color: var(--accent); }

.sub {
  font-size: var(--text-sm);
  color: var(--ink-2);
}
</style>
