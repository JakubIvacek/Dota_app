<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value: string
    sub?: string
    /** Farba hodnoty — win/loss nesie informáciu (nad/pod 50 %…), default je neutrálna. */
    tone?: 'default' | 'win' | 'loss' | 'accent'
    /** lg — jeden „featured“ stat na stránke (napr. all-time winrate), nech
     * hierarchia štyroch čísel v rade nie je štyri rovnaké krabičky. */
    size?: 'md' | 'lg'
  }>(),
  { tone: 'default', size: 'md' },
)
</script>

<template>
  <div class="card stat" :class="size">
    <div class="label">{{ label }}</div>
    <div class="value" :class="tone">{{ value }}</div>
    <div v-if="sub" class="sub">{{ sub }}</div>
  </div>
</template>

<style scoped>
.stat {
  padding: var(--space-3) var(--space-5);
}

.stat.lg {
  padding: var(--space-5) var(--space-6);
  background:
    radial-gradient(180px 120px at 100% 0%, rgba(57, 135, 229, 0.1), transparent 70%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 40%),
    var(--surface);
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

.stat.lg .value {
  font-size: var(--text-2xl);
  margin-top: var(--space-1);
}

.value.win { color: var(--win); }
.value.loss { color: var(--loss); }
.value.accent { color: var(--accent); }

.sub {
  font-size: var(--text-sm);
  color: var(--ink-2);
}
</style>
