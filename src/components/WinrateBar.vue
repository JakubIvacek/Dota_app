<script setup lang="ts">
import { computed } from 'vue'
import { winratePct } from '../utils/format'

/** Winrate ako číslo + tichý bar — na dlhých zoznamoch (heroes, mode splits)
 * sa percentá inak nedajú porovnávať očami. */
const props = defineProps<{
  win: number
  games: number
}>()

const ratio = computed(() => (props.games ? props.win / props.games : 0))
</script>

<template>
  <div class="wr">
    <span class="wr-value">{{ winratePct(win, games) }} %</span>
    <span class="wr-track">
      <span
        class="wr-fill"
        :class="ratio >= 0.5 ? 'good' : 'bad'"
        :style="{ width: `${ratio * 100}%` }"
      />
    </span>
  </div>
</template>

<style scoped>
.wr {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.wr-value {
  min-width: 3.6rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.wr-track {
  width: 72px;
  height: 5px;
  border-radius: var(--radius-sm);
  background: var(--grid);
  overflow: hidden;
}

.wr-fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-sm);
}

.wr-fill.good { background: var(--win); }
.wr-fill.bad { background: var(--dire-strong); }
</style>
