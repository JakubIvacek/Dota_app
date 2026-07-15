<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
  }>(),
  { height: 260 },
)

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

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

onMounted(() => {
  chart = new Chart(canvas.value!, {
    type: 'line',
    data: buildData(),
    plugins: props.teamSplit ? [buildTeamSplitPlugin(props.teamSplit)] : [],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { left: props.teamSplit ? 20 : 0 } },
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
  () => [props.labels, props.datasets],
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
    <div :style="{ height: `${height}px`, position: 'relative' }">
      <canvas ref="canvas"></canvas>
    </div>
  </div>
</template>

<style scoped>
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
</style>
