<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineController,
  LineElement,
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

function buildData() {
  return {
    labels: props.labels,
    datasets: props.datasets.map((d) => ({
      label: d.label,
      data: d.data,
      borderColor: d.color,
      backgroundColor: d.color,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.25,
    })),
  }
}

onMounted(() => {
  chart = new Chart(canvas.value!, {
    type: 'line',
    data: buildData(),
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
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
          grid: { color: (ctx) => (ctx.tick.value === 0 ? BASELINE : GRID) },
          ticks: {
            color: MUTED,
            callback: (value) => (props.yFormat ? props.yFormat(Number(value)) : value),
          },
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
