<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  CategoryScale,
  Chart,
  LinearScale,
  LineController,
  LineElement,
  type Plugin,
  PointElement,
  Tooltip,
} from 'chart.js'
import { cssVar } from '../utils/theme'
import TeamGlyph from './TeamGlyph.vue'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip)

const props = withDefaults(
  defineProps<{
    labels: (string | number)[]
    datasets: { label: string; data: number[]; color: string }[]
    height?: number
    yFormat?: (value: number) => string
    /** Voliteľné rozdelenie plochy na hornú/dolnú "tímovú" zónu okolo nuly
     * (napr. Radiant/Dire pri gold/XP advantage) — mimo tohto prípadu sa
     * komponent správa ako obyčajný line chart. Wash farby by mali byť nízko-
     * alfa rgba() (napr. --radiant-soft), label farby plnosýte (--radiant-strong). */
    teamSplit?: {
      topLabel: string
      bottomLabel: string
      topWash: string
      bottomWash: string
      topLabelColor: string
      bottomLabelColor: string
    }
    /** Voliteľné ikonové značky na časovej osi (napr. kill eventy) — kreslené
     * ako DOM overlay nad canvasom, nie priamo na canvas, kvôli natívnemu
     * hoveru/title bez boja s Chart.js tooltip systémom pre obrázkové body. */
    killMarkers?: { time: number; isRadiant: boolean; iconUrl: string; title: string }[]
    /** Zobrazí sa nad grafom, len keď je pod MIN_CHART_WIDTH breakpointom
     * (viď .chart-scroll-hint media query) — na mobile inak nie je zjavné,
     * že graf s kill markermi je horizontálne scrollovateľný. */
    scrollHint?: string
  }>(),
  { height: 260 },
)

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

const MARKER_SIZE = 18

interface MarkerPosition {
  key: string
  left: number
  top: number
  zIndex: number
  isRadiant: boolean
  iconUrl: string
  title: string
}

const markers = ref<MarkerPosition[]>([])
const hoveredMarkerKey = ref<string | null>(null)
const hoveredMarker = computed(() => markers.value.find((m) => m.key === hoveredMarkerKey.value))

// Rovnaký princíp ako ActivityHeatmap na mobile: graf sa fluidne zmršťuje s
// kontajnerom až po tento floor (kill markery majú dosť miesta, nekolidujú) —
// pod ním radšej natívna šírka + horizontálny scroll ako ďalšie zmršťovanie.
// Viď .chart-scroll nižšie.
const MIN_CHART_WIDTH = 900
const minChartWidth = computed(() => (props.killMarkers?.length ? MIN_CHART_WIDTH : 0))

/* Čítať skutočné CSS premenné namiesto duplicitných hexov — jeden zdroj pravdy v tokens.css. */
const INK = cssVar('--ink')
const INK_2 = cssVar('--ink-2')
const MUTED = cssVar('--muted')
const GRID = cssVar('--grid')
const BASELINE = cssVar('--baseline')
const ZERO_LINE_STRONG = cssVar('--ink-2')
const FONT_BODY = cssVar('--font-body')
const SURFACE_2 = cssVar('--surface-2')
const BORDER_STRONG = cssVar('--border-strong')

function buildData() {
  return {
    labels: props.labels,
    datasets: props.datasets.map((d) => ({
      label: d.label,
      data: d.data,
      borderColor: d.color,
      backgroundColor: d.color,
      borderWidth: 2.5,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.3,
    })),
  }
}

/* Zaokrúhli nahor na "pekné" číslo — jemnejšie kroky (1/1.5/2/2.5/3/4/5/6/7.5/10 ×
 * mocnina desiatky) než klasické 1/2/5/10, aby napr. hodnota tesne nad 5×
 * nepreskočila rovno na 10× a nevyplytvala takmer polovicu osi Y prázdnym
 * priestorom (12345 -> 15000, nie 20000). */
function niceCeil(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const residual = value / magnitude
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 10]
  const niceResidual = steps.find((s) => residual <= s) ?? 10
  return niceResidual * magnitude
}

/* Symetrický rozsah osi Y okolo nuly, aby nulová os (hranica Radiant/Dire)
 * padla presne na stred plochy namiesto niekde podľa toho, kam vyjde min/max dát.
 * Zaokrúhlenie na pekné číslo bez extra paddingu — niceCeil už dáva dostatočnú
 * rezervu nad najvyššiu hodnotu, netreba ju ešte navyšovať o 10 %. */
function symmetricBounds() {
  const maxAbs = Math.max(1, ...props.datasets.flatMap((d) => d.data.map((v) => Math.abs(v))))
  const bound = niceCeil(maxAbs)
  return { min: -bound, max: bound }
}

/* Maľuje hornú/dolnú tímovú zónu (wash gradient smerom k nulovej osi) a zvislé
 * popisky na ľavom okraji — vykreslené na canvase, keďže --*-wash tokeny sú
 * CSS gradienty, ktoré canvas priamo použiť nevie. */
function buildTeamSplitPlugin(config: NonNullable<typeof props.teamSplit>): Plugin<'line'> {
  return {
    id: 'teamSplit',
    beforeDatasetsDraw(c) {
      const { ctx, chartArea, scales } = c
      if (!chartArea) return
      // Os Y je nastavená symetricky okolo 0 (pozri symmetricBounds), takže
      // skutočný pixel hodnoty 0 padne presne na stred plochy.
      const zeroY = scales.y.getPixelForValue(0)

      ctx.save()
      const topGrad = ctx.createLinearGradient(0, chartArea.top, 0, zeroY)
      topGrad.addColorStop(0, config.topWash)
      topGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = topGrad
      ctx.fillRect(chartArea.left, chartArea.top, chartArea.width, zeroY - chartArea.top)

      const bottomGrad = ctx.createLinearGradient(0, zeroY, 0, chartArea.bottom)
      bottomGrad.addColorStop(0, 'transparent')
      bottomGrad.addColorStop(1, config.bottomWash)
      ctx.fillStyle = bottomGrad
      ctx.fillRect(chartArea.left, zeroY, chartArea.width, chartArea.bottom - zeroY)
      ctx.restore()
    },
    afterDraw(c) {
      const { ctx, chartArea, scales } = c
      if (!chartArea) return
      const zeroY = scales.y.getPixelForValue(0)

      const drawLabel = (text: string, color: string, midY: number) => {
        ctx.save()
        ctx.fillStyle = color
        ctx.font = `600 11px ${FONT_BODY}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.translate(chartArea.left + 8, midY)
        ctx.rotate(-Math.PI / 2)
        ctx.fillText(text, 0, 0)
        ctx.restore()
      }

      drawLabel(config.topLabel, config.topLabelColor, (chartArea.top + zeroY) / 2)
      drawLabel(config.bottomLabel, config.bottomLabelColor, (zeroY + chartArea.bottom) / 2)
    },
  }
}

/* Prepočíta DOM pozície kill-markerov z aktuálnej x-škály — beží v afterLayout,
 * takže sa automaticky prepočíta pri každom chart.update() (dáta, resize).
 * Kategórie (minútové bucket-y) sú rovnomerne rozložené naprieč chartArea
 * (offset: false), takže lineárna interpolácia podľa sekúnd zodpovedá presne
 * tomu, kam by padol dátový bod so zlomkovým časom. */
function buildKillMarkerPlugin(): Plugin<'line'> {
  return {
    id: 'killMarkers',
    afterLayout(c) {
      const events = props.killMarkers
      const { chartArea } = c
      const totalMinutes = props.labels.length - 1
      if (!events?.length || !chartArea || totalMinutes <= 0) {
        if (markers.value.length) markers.value = []
        return
      }
      const pxPerMinute = (chartArea.right - chartArea.left) / totalMinutes

      // Kills v rovnakej minúte (rovnaká teamfight) zdieľajú x — namiesto
      // rozťahovania do šírky (ktoré by zasahovalo do susedných minút) sa
      // vrství vertikálne na sebe, mierne posunuté, ako balíček kariet —
      // každá ikona ostáva čiastočne viditeľná, ale stĺpec sa nikdy nerozlieva
      // do susedného minútového bucketu.
      const STACK_OFFSET = 21
      const MARKER_INSET = 4

      // Klip na [0, totalMinutes] rieši len presný overflow (kill tesne po
      // poslednej celej minúte by inak zaokrúhlil mimo rozsah dát). Kills
      // v posledných/prvých EDGE_MERGE_SECONDS sekundách matchu naviac
      // schválne stiahni na krajný bucket — inak by boli tak blízko canvas
      // hranice, že by po pixel-clipe (nižšie) kolidovali so susedným bucketom.
      const EDGE_MERGE_SECONDS = 90
      const matchEndSeconds = totalMinutes * 60
      function resolveBucket(time: number): number {
        if (time <= EDGE_MERGE_SECONDS) return 0
        if (matchEndSeconds - time <= EDGE_MERGE_SECONDS) return totalMinutes
        return Math.min(totalMinutes, Math.max(0, Math.round(time / 60)))
      }

      const buckets = new Map<string, typeof events>()
      for (const e of events) {
        const bucketKey = `${resolveBucket(e.time)}-${e.isRadiant}`
        const group = buckets.get(bucketKey)
        if (group) group.push(e)
        else buckets.set(bucketKey, [e])
      }

      const newMarkers: MarkerPosition[] = []
      for (const group of buckets.values()) {
        const bucket = resolveBucket(group[0].time)
        const isRadiant = group[0].isRadiant
        // Bezpečnostný pixel-clip navyše — istota, že ikona nikdy nepresiahne
        // canvas hranicu, nech vyjde pxPerMinute/padding akokoľvek.
        const idealLeft = chartArea.left + bucket * pxPerMinute - MARKER_SIZE / 2
        const left = Math.min(Math.max(idealLeft, chartArea.left), chartArea.right - MARKER_SIZE)
        const sorted = [...group].sort((a, b) => a.time - b.time)
        sorted.forEach((e, i) => {
          newMarkers.push({
            key: `${bucket}-${isRadiant}-${i}`,
            left,
            top: isRadiant
              ? chartArea.top + MARKER_INSET + i * STACK_OFFSET
              : chartArea.bottom - MARKER_INSET - MARKER_SIZE - i * STACK_OFFSET,
            zIndex: i,
            isRadiant,
            iconUrl: e.iconUrl,
            title: e.title,
          })
        })
      }
      markers.value = newMarkers
    },
  }
}

onMounted(() => {
  chart = new Chart(canvas.value!, {
    type: 'line',
    data: buildData(),
    plugins: [
      ...(props.teamSplit ? [buildTeamSplitPlugin(props.teamSplit)] : []),
      buildKillMarkerPlugin(),
    ],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      // Kill markery na prvej/poslednej minúte sedia presne na okraji chartArea
      // (left/right = idealLeft ± MARKER_SIZE/2) — bez rezervy by ich polovica
      // trčala mimo canvas. Rezervuj aspoň MARKER_SIZE/2 + malý gutter na oboch
      // stranách, keď sú kill markery aktívne.
      layout: {
        padding: {
          left: Math.max(props.teamSplit ? 4 : 0, props.killMarkers?.length ? MARKER_SIZE / 2 + 4 : 0),
          right: props.killMarkers?.length ? MARKER_SIZE / 2 + 4 : 0,
        },
      },
      plugins: {
        tooltip: {
          callbacks: props.yFormat
            ? {
                label: (ctx) => `${ctx.dataset.label}: ${props.yFormat!(ctx.parsed.y ?? 0)}`,
              }
            : undefined,
          // Theme the tooltip to match the app surface instead of Chart.js's
          // default flat-black box — rounded corners, tokenized surface/border.
          backgroundColor: SURFACE_2,
          titleColor: INK,
          bodyColor: INK_2,
          borderColor: BORDER_STRONG,
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          boxPadding: 4,
          usePointStyle: true,
          titleFont: { family: FONT_BODY, weight: 600 },
          bodyFont: { family: FONT_BODY },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: MUTED, maxTicksLimit: 6, maxRotation: 0 },
        },
        y: {
          // Nulová os výraznejšia — pri gold/XP advantage oddeľuje Radiant/Dire.
          // S teamSplit ešte výraznejšia (takmer biela), keďže je to hranica tímov.
          grid: {
            color: (ctx) =>
              ctx.tick.value === 0 ? (props.teamSplit ? ZERO_LINE_STRONG : BASELINE) : GRID,
          },
          ticks: {
            color: MUTED,
            callback: (value) => (props.yFormat ? props.yFormat(Number(value)) : value),
          },
          ...(props.teamSplit ? symmetricBounds() : {}),
        },
      },
    },
  })
})

watch(
  () => [props.labels, props.datasets, props.killMarkers],
  () => {
    if (!chart) return
    chart.data = buildData()
    if (props.teamSplit && chart.options.scales?.y) {
      Object.assign(chart.options.scales.y, symmetricBounds())
    }
    chart.update()
  },
  { deep: true },
)

onBeforeUnmount(() => chart?.destroy())
</script>

<template>
  <div>
    <!-- Real HTML legend instead of Chart.js's canvas-drawn one — its layout math
         only gives a fixed +10px regardless of padding, so the gap to the plot
         area below never grows the way you'd expect from labels.padding. -->
    <ul v-if="datasets.length > 1" class="chart-legend">
      <li v-for="d in datasets" :key="d.label" class="chart-legend-item">
        <span class="chart-legend-dot" :style="{ backgroundColor: d.color }"></span>
        {{ d.label }}
      </li>
    </ul>
    <p v-if="scrollHint && minChartWidth" class="chart-scroll-hint">{{ scrollHint }}</p>
    <div class="chart-scroll">
      <div
        :style="{
          height: `${height}px`,
          position: 'relative',
          minWidth: minChartWidth ? `${minChartWidth}px` : undefined,
        }"
      >
        <canvas ref="canvas"></canvas>
        <img
          v-for="m in markers"
          :key="m.key"
          :src="m.iconUrl"
          :alt="m.title"
          class="kill-marker"
          :style="{
            left: `${m.left}px`,
            top: `${m.top}px`,
            width: `${MARKER_SIZE}px`,
            height: `${MARKER_SIZE}px`,
            zIndex: m.key === hoveredMarkerKey ? markers.length : m.zIndex,
          }"
          @mouseenter="hoveredMarkerKey = m.key"
          @mouseleave="hoveredMarkerKey = null"
        />
        <div
          v-if="hoveredMarker"
          class="kill-marker-tooltip"
          :class="hoveredMarker.isRadiant ? 'below' : 'above'"
          :style="{
            left: `${hoveredMarker.left + MARKER_SIZE / 2}px`,
            top: `${hoveredMarker.isRadiant ? hoveredMarker.top + MARKER_SIZE + 6 : hoveredMarker.top - 6}px`,
          }"
        >
          <TeamGlyph :side="hoveredMarker.isRadiant ? 'radiant' : 'dire'" class="tooltip-glyph" />
          {{ hoveredMarker.title }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Rovnaký vzor ako ActivityHeatmap na mobile: nezmršťovať dáta do úzkeho
   viewportu (kill markery by kolidovali) — radšej natívna min-width a
   horizontálny scroll, keď sa nezmestí. */
/* Vytiahni graf až po ľavý okraj karty — kompenzuj .card-ov vlastný
   left padding (--space-5), nech chartArea nezačína zbytočne ďaleko
   od okraja karty. */
.chart-scroll {
  overflow-x: auto;
  margin-left: calc(-1 * var(--space-5));
}

/* Vidno len pod MIN_CHART_WIDTH (900px v script setup — drž v sync). Nad tým
   sa graf ešte fluidne zmršťuje s kontajnerom, scroll nehrozí. */
.chart-scroll-hint {
  display: none;
  margin: 0 0 var(--space-2);
  font-size: var(--text-xs);
  color: var(--muted);
  text-align: center;
}

@media (max-width: 900px) {
  .chart-scroll-hint {
    display: block;
  }
}

.chart-legend {
  display: flex;
  gap: var(--space-4);
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-4);
}

.chart-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  color: var(--ink-2);
}

.chart-legend-dot {
  width: 12px;
  height: 12px;
  border-radius: var(--radius-sm);
  display: inline-block;
}

.kill-marker {
  position: absolute;
  object-fit: cover;
  border-radius: var(--radius-sm);
  pointer-events: auto;
  transition: transform var(--duration-fast) var(--ease-out);
}

.kill-marker:hover {
  transform: scale(1.4);
}

.kill-marker-tooltip {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  transform: translateX(-50%);
  background: var(--surface-2);
  color: var(--ink);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  padding: 0.25rem 0.55rem;
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
  box-shadow: var(--shadow-sm);
}

.kill-marker-tooltip.above {
  transform: translate(-50%, -100%);
}

.tooltip-glyph {
  width: 1em;
  height: 1em;
  display: block;
  align-self: center;
  margin-top: 2px;
}
</style>
