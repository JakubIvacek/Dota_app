<script setup lang="ts">
import { computed, ref, watchEffect, nextTick } from 'vue'
import { useAppLocale } from '../composables/useAppLocale'

const props = defineProps<{
  /** Matche za posledný rok — stačí start_time + výsledok. */
  matches: { start_time: number; won: boolean }[]
}>()

const { t, intlLocale } = useAppLocale()

// Mobilný scroll kontajner otvor na najnovšom týždni, nie na najstaršom.
const scrollEl = ref<HTMLElement | null>(null)
watchEffect(async () => {
  const el = scrollEl.value
  if (!el || !props.matches) return
  await nextTick()
  el.scrollLeft = el.scrollWidth
})

const CELL = 12
const GAP = 3
const PITCH = CELL + GAP
const WEEKS = 53
const LABEL_LEFT = 30
const LABEL_TOP = 18

/* Sekvenčný ramp (ordinal, validovaný na dark surface) — 0 matchov = grid. */
const LEVELS = ['var(--grid)', '#20603a', '#279350', '#3cc161', '#7ce49a']

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Pondelok týždňa, do ktorého deň patrí (EU konvencia). */
function mondayOf(d: Date) {
  const out = new Date(d)
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7))
  out.setHours(0, 0, 0, 0)
  return out
}

const buckets = computed(() => {
  const map = new Map<string, { games: number; wins: number }>()
  for (const m of props.matches) {
    const key = dayKey(new Date(m.start_time * 1000))
    const b = map.get(key) ?? { games: 0, wins: 0 }
    b.games++
    if (m.won) b.wins++
    map.set(key, b)
  }
  return map
})

const level = (games: number) => (games === 0 ? 0 : games === 1 ? 1 : games === 2 ? 2 : games <= 4 ? 3 : 4)

interface Cell {
  x: number
  y: number
  fill: string
  title: string
}

const grid = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = mondayOf(new Date(today.getTime() - (WEEKS - 1) * 7 * 86_400_000))

  const cells: Cell[] = []
  const months: { x: number; label: string }[] = []
  let lastMonth = -1

  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getTime() + (w * 7 + d) * 86_400_000)
      if (date > today) break
      const b = buckets.value.get(dayKey(date))
      const games = b?.games ?? 0
      const label = date.toLocaleDateString(intlLocale.value, { day: 'numeric', month: 'numeric', year: 'numeric' })
      cells.push({
        x: LABEL_LEFT + w * PITCH,
        y: LABEL_TOP + d * PITCH,
        fill: LEVELS[level(games)],
        title: games
          ? t('activity.tooltip', { date: label, n: games, wins: b!.wins, losses: games - b!.wins }, games)
          : t('activity.noMatchesOnDate', { date: label }),
      })
      // Popisok mesiaca nad prvým týždňom, ktorý doň spadá.
      if (d === 0 && date.getMonth() !== lastMonth) {
        lastMonth = date.getMonth()
        months.push({
          x: LABEL_LEFT + w * PITCH,
          label: date.toLocaleDateString(intlLocale.value, { month: 'short' }).replace('.', ''),
        })
      }
    }
  }
  // Prvý mesačný popisok býva orezaný týždňom z konca predošlého mesiaca — vynechaj ak koliduje.
  if (months.length > 1 && months[1].x - months[0].x < 30) months.shift()
  return { cells, months }
})

const width = LABEL_LEFT + WEEKS * PITCH
const height = LABEL_TOP + 7 * PITCH

// Referenčný týždeň (pondelok 2024-01-01) — len na vytiahnutie krátkych
// názvov dní cez Intl, nech sa neprekladajú ručne pre každý jazyk zvlášť.
const REF_MONDAY = new Date(2024, 0, 1)
const weekdayShort = (offset: number) =>
  new Date(REF_MONDAY.getTime() + offset * 86_400_000).toLocaleDateString(intlLocale.value, { weekday: 'short' })

const DAY_LABELS = computed(() => [
  { label: weekdayShort(0), row: 0 },
  { label: weekdayShort(2), row: 2 },
  { label: weekdayShort(4), row: 4 },
])

const totalGames = computed(() => props.matches.length)
</script>

<template>
  <div class="heatmap">
    <div class="heatmap-scroll" ref="scrollEl">
      <svg
        :viewBox="`0 0 ${width} ${height}`"
        :width="width"
        :height="height"
        :aria-label="t('activity.ariaLabel', { n: totalGames }, totalGames)"
      >
        <text v-for="m in grid.months" :key="m.x" :x="m.x" :y="LABEL_TOP - 7" class="axis-label">
          {{ m.label }}
        </text>
        <text
          v-for="d in DAY_LABELS"
          :key="d.label"
          :x="LABEL_LEFT - 8"
          :y="LABEL_TOP + d.row * PITCH + CELL - 2.5"
          class="axis-label"
          text-anchor="end"
        >
          {{ d.label }}
        </text>
        <rect
          v-for="c in grid.cells"
          :key="`${c.x}-${c.y}`"
          :x="c.x"
          :y="c.y"
          :width="CELL"
          :height="CELL"
          :fill="c.fill"
          rx="3"
          class="cell"
        >
          <title>{{ c.title }}</title>
        </rect>
      </svg>
    </div>
    <div class="legend">
      <span class="muted">{{ t('activity.totalGames', { n: totalGames }, totalGames) }}</span>
      <span class="scale">
        <span class="muted">{{ t('activity.less') }}</span>
        <span v-for="(fill, i) in LEVELS" :key="i" class="swatch" :style="{ background: fill }" />
        <span class="muted">{{ t('activity.more') }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.heatmap-scroll {
  overflow-x: auto;
}

svg {
  width: 100%;
  height: auto;
  display: block;
}

/* Pod 720px sa mriežka nezmršťuje na nečitateľné bunky — radšej natívna
   veľkosť + horizontálny scroll, nech ostane vidno aspoň pár posledných týždňov. */
@media (max-width: 720px) {
  svg {
    width: auto;
    max-width: none;
  }
}

.axis-label {
  fill: var(--muted);
  font-size: 10px;
}

.cell:hover {
  stroke: var(--ink-2);
  stroke-width: 1;
}

.legend {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  font-size: 0.8rem;
}

.scale {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.swatch {
  width: 11px;
  height: 11px;
  border-radius: 3px;
}
</style>
