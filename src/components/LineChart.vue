<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  type Plugin,
  PointElement,
  Tooltip,
} from 'chart.js'
import { cssVar } from '../utils/theme'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend)

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
const INK_2 = cssVar('--ink-2')
const MUTED = cssVar('--muted')
const GRID = cssVar('--grid')
const BASELINE = cssVar('--baseline')
const ZERO_LINE_STRONG = cssVar('--ink-2')
const FONT_BODY = cssVar('--font-body')

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

/* Zaokrúhli nahor na "pekné" číslo (1/2/5 × mocnina desiatky) — 12345 -> 15000. */
function niceCeil(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const residual = value / magnitude
  const niceResidual = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10
  return niceResidual * magnitude
}

/* Symetrický rozsah osi Y okolo nuly, aby nulová os (hranica Radiant/Dire)
 * padla presne na stred plochy namiesto niekde podľa toho, kam vyjde min/max dát.
 * +10% padding nad najvyššiu hodnotu a zaokrúhlenie na pekné číslo. */
function symmetricBounds() {
  const maxAbs = Math.max(1, ...props.datasets.flatMap((d) => d.data.map((v) => Math.abs(v))))
  const bound = niceCeil(maxAbs * 1.1)
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
        ctx.translate(chartArea.left + 12, midY)
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
      layout: props.teamSplit ? { padding: { left: 28 } } : undefined,
      plugins: {
        legend: {
          display: props.datasets.length > 1,
          labels: { color: INK_2, boxWidth: 12, boxHeight: 12 },
        },
        tooltip: {
          callbacks: props.yFormat
            ? {
                label: (ctx) => `${ctx.dataset.label}: ${props.yFormat!(ctx.parsed.y ?? 0)}`,
              }
            : undefined,
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
  <div :style="{ height: `${height}px`, position: 'relative' }">
    <canvas ref="canvas"></canvas>
  </div>
</template>
