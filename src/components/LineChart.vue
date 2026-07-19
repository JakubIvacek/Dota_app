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
  type ChartType,
  type TooltipPositionerFunction,
} from 'chart.js'
import { cssVar } from '../utils/theme'
import TeamGlyph from './TeamGlyph.vue'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip)

// Chart.js's built-in TooltipPositionerMap only declares "average"/"nearest" —
// module augmentation is the documented way to add a custom positioner key
// (https://www.chartjs.org/docs/latest/configuration/tooltip.html#positioners).
declare module 'chart.js' {
  interface TooltipPositionerMap {
    centerY: TooltipPositionerFunction<ChartType>
  }
}

/* Kill markery sedia v riadkoch pri hornom/dolnom okraji chartArea — defaultný
 * tooltip positioner ("average") drží tooltip pri kurzore, takže pri hoveri
 * blízko okraja prekrýva ikony. Zafixuj tooltip na vertikálny stred grafu,
 * x nech sleduje dátový bod ako predtým. */
Tooltip.positioners.centerY = function (items, eventPosition) {
  const pos = Tooltip.positioners.average.call(this, items, eventPosition)
  if (!pos) return false
  const chartArea = this.chart.chartArea
  return { x: pos.x, y: (chartArea.top + chartArea.bottom) / 2 }
}

interface KillMarkerEvent {
  time: number
  isRadiant: boolean
  iconUrl: string
  title: string
}

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
    killMarkers?: KillMarkerEvent[]
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
  groupKey: string
  left: number
  top: number
  zIndex: number
  isRadiant: boolean
  iconUrl: string
  title: string
  /** True pre "+N" overflow placeholder namiesto skutočnej kill ikony — viď
   * VISIBLE_STACK_LIMIT v buildKillMarkerPlugin. */
  isOverflow?: boolean
  overflowCount?: number
}

const markers = ref<MarkerPosition[]>([])
// Plný zoznam killov na skupinu (bucket+tím), nezávisle od toho, koľko sa ich
// reálne vykreslí ako ikony — tooltip musí vedieť vypísať VŠETKY kills aj keď
// je väčšina z nich schovaná za "+N" overflow placeholderom.
const groupEvents = ref<Map<string, KillMarkerEvent[]>>(new Map())
// Hover ALEBO klik na ktorúkoľvek ikonu v stacku (vrátane "+N" placeholderu)
// otvorí zoznam VŠETKÝCH killov v tej istej bucket+tím skupine naraz — klik
// sa správa rovnako ako hover (potrebný na touch, kde mouseenter/leave
// nenastane). Zavretie pri odídení myšou je oneskorené (viď scheduleClose
// nižšie), nech sa dá prejsť z markera do samotného tooltipu.
const activeGroupKey = ref<string | null>(null)
const activeGroupMarkers = computed(() =>
  markers.value.filter((m) => m.groupKey === activeGroupKey.value),
)
const activeGroupEvents = computed(() => groupEvents.value.get(activeGroupKey.value ?? '') ?? [])

// Medzi markerom a tooltipom je medzera (MARKER_SIZE + 6px, viď top nižšie) —
// okamžité zavretie na mouseleave z markera by tooltip zrušilo skôr, než tam
// kurzor pri prechode cez túto medzeru vôbec stihne dorazit (Vue stihne
// odmountovať element skôr, než ho myš "chytí"), takže pri viacerých killoch
// sa k scrollovateľnému zoznamu nedalo myšou vôbec dostať. Zavretie sa preto
// mierne oneskorí a zruší, ak medzitým príde mouseenter na marker ALEBO na
// samotný tooltip — hover tak prežije prechod cez medzeru aj scrollovanie.
let closeTimeout: ReturnType<typeof setTimeout> | null = null
function cancelClose() {
  if (closeTimeout) {
    clearTimeout(closeTimeout)
    closeTimeout = null
  }
}
function openGroup(groupKey: string) {
  cancelClose()
  activeGroupKey.value = groupKey
}
function scheduleClose() {
  cancelClose()
  closeTimeout = setTimeout(() => {
    activeGroupKey.value = null
    closeTimeout = null
  }, 150)
}

// Musí sedieť s .kill-marker-tooltip max-width v <style> — použité na
// pixel-clip zoznamu killov nižšie, nech pri stĺpci blízko okraja grafu
// tooltip nevyletí mimo kartu (tam by sa jeho text orezal).
const TOOLTIP_WIDTH = 240
const chartScroll = ref<HTMLDivElement | null>(null)
// Klampuj na aktuálne VIDITEĽNÉ (scrollnuté) okno .chart-scroll, nie na celý
// (často oveľa širší, horizontálne scrollovateľný) canvas — inak by sa
// tooltip pri stĺpci blízko konca dlhého matchu vedel odtiahnuť ďaleko od
// klikanej ikony smerom k pravému okraju CELÉHO grafu, mimo aktuálny výrez.
const viewportPixelBounds = ref({ left: 0, right: 0 })
function updateViewportPixelBounds() {
  const el = chartScroll.value
  if (!el) return
  viewportPixelBounds.value = { left: el.scrollLeft, right: el.scrollLeft + el.clientWidth }
}
// Rovnaký pixel-clip princíp ako pri samotných markeroch (left v
// buildKillMarkerPlugin) — vycentruj na markeri, ale nedovoľ, aby ktorýkoľvek
// okraj tooltipu presiahol viditeľné okno.
const activeGroupTooltipLeft = computed(() => {
  const anchor = activeGroupMarkers.value[0]
  if (!anchor) return 0
  const idealCenter = anchor.left + MARKER_SIZE / 2
  const half = TOOLTIP_WIDTH / 2
  const { left, right } = viewportPixelBounds.value
  if (right <= left) return idealCenter
  return Math.min(Math.max(idealCenter, left + half), right - half)
})

// Minimálna šírka na 1 minútu, kým sa bucket-y v buildKillMarkerPlugin
// nezačnú zlučovať do širších časových okien — mierny prekryv ikon pri
// hustých teamfightoch je OK, uprednostni krátke časové okno pred úplným
// rozostupom. Drž v sync s buildKillMarkerPlugin, ktorý ju používa priamo.
const MIN_MINUTE_PX = MARKER_SIZE + 6
const totalMinutes = computed(() => Math.max(0, props.labels.length - 1))

// Rovnaký princíp ako ActivityHeatmap na mobile: graf sa fluidne zmršťuje s
// kontajnerom až po tento floor (kill markery majú dosť miesta, nekolidujú) —
// pod ním radšej natívna šírka + horizontálny scroll ako ďalšie zmršťovanie.
// Pevná hodnota (nerastie s dĺžkou matchu) — na dlhých matchoch namiesto
// naťahovania grafu do šírky radšej bucket-merging v buildKillMarkerPlugin
// zlúči kills do širších časových okien. Viď .chart-scroll nižšie.
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
      updateViewportPixelBounds()
      if (!events?.length || !chartArea || totalMinutes.value <= 0) {
        if (markers.value.length) markers.value = []
        return
      }
      const pxPerMinute = (chartArea.right - chartArea.left) / totalMinutes.value

      // Kills v rovnakom bucket-e (rovnaká teamfight) zdieľajú x — namiesto
      // rozťahovania do šírky (ktoré by zasahovalo do susedných bucketov) sa
      // vrství vertikálne na sebe, mierne posunuté, ako balíček kariet —
      // každá ikona ostáva čiastočne viditeľná, ale stĺpec sa nikdy nerozlieva
      // do susedného bucketu.
      const STACK_OFFSET = MARKER_SIZE + 4
      const MARKER_INSET = 4
      // Pri veľkom teamfighte (6+ killov v jednom bucket-e) by neobmedzený
      // vertikálny stack vytrčal cez okraj chartArea — zobraz najviac
      // VISIBLE_STACK_LIMIT slotov a zvyšok skry za "+N" placeholder v
      // poslednom slote (skutočné kill dáta ostávajú v groupEvents pre
      // tooltip, viď nižšie).
      const VISIBLE_STACK_LIMIT = 5

      // Bucket širka (v minútach) je 1 minúta, kým na to stačí pxPerMinute —
      // na dlhých matchoch/úzkych viewportoch by sa pri pevnej 1-minútovej
      // šírke susedné stĺpce prekrývali cez seba úplne, tak sa okno rozšíri
      // na 2, 3, ... minút, kým medzi bucketmi nezostane aspoň MIN_MINUTE_PX
      // voľného miesta. Zámerne bez ďalšej rezervy navyše — mierny prekryv
      // ikon (napr. pri edge-clipe krajného bucketu nižšie) je akceptovateľný,
      // priorita je čo najkratšie časové okno na stĺpec, nie nulový prekryv.
      const minutesPerBucket = Math.max(1, Math.ceil(MIN_MINUTE_PX / pxPerMinute))
      const bucketCount = Math.ceil(totalMinutes.value / minutesPerBucket)

      // Klip na [0, bucketCount] rieši len presný overflow (kill tesne po
      // poslednom celom bucket-e by inak zaokrúhlil mimo rozsah dát). Kills
      // v posledných/prvých EDGE_MERGE_SECONDS sekundách matchu naviac
      // schválne stiahni na krajný bucket — inak by boli tak blízko canvas
      // hranice, že by po pixel-clipe (nižšie) kolidovali so susedným bucketom.
      const EDGE_MERGE_SECONDS = 90
      const matchEndSeconds = totalMinutes.value * 60
      function resolveBucket(time: number): number {
        if (time <= EDGE_MERGE_SECONDS) return 0
        if (matchEndSeconds - time <= EDGE_MERGE_SECONDS) return bucketCount
        return Math.min(bucketCount, Math.max(0, Math.round(time / 60 / minutesPerBucket)))
      }

      const buckets = new Map<string, typeof events>()
      for (const e of events) {
        const bucketKey = `${resolveBucket(e.time)}-${e.isRadiant}`
        const group = buckets.get(bucketKey)
        if (group) group.push(e)
        else buckets.set(bucketKey, [e])
      }

      const newMarkers: MarkerPosition[] = []
      const newGroupEvents = new Map<string, KillMarkerEvent[]>()
      for (const [groupKey, group] of buckets) {
        const bucket = resolveBucket(group[0].time)
        const isRadiant = group[0].isRadiant
        // Bezpečnostný pixel-clip navyše — istota, že ikona nikdy nepresiahne
        // canvas hranicu, nech vyjde pxPerMinute/padding akokoľvek.
        const idealLeft = chartArea.left + bucket * minutesPerBucket * pxPerMinute - MARKER_SIZE / 2
        const left = Math.min(Math.max(idealLeft, chartArea.left), chartArea.right - MARKER_SIZE)
        const sorted = [...group].sort((a, b) => a.time - b.time)
        newGroupEvents.set(groupKey, sorted)

        // Nad VISIBLE_STACK_LIMIT killov sa posledný slot zmení na "+N"
        // placeholder namiesto (VISIBLE_STACK_LIMIT)-tej reálnej ikony —
        // zvyšné kills ostávajú dostupné len cez tooltip (groupEvents).
        const overflowCount = Math.max(0, sorted.length - VISIBLE_STACK_LIMIT)
        const visibleCount = overflowCount > 0 ? VISIBLE_STACK_LIMIT - 1 : sorted.length
        const visible = sorted.slice(0, visibleCount)

        visible.forEach((e, i) => {
          newMarkers.push({
            key: `${groupKey}-${i}`,
            groupKey,
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

        if (overflowCount > 0) {
          const i = visible.length
          newMarkers.push({
            key: `${groupKey}-overflow`,
            groupKey,
            left,
            top: isRadiant
              ? chartArea.top + MARKER_INSET + i * STACK_OFFSET
              : chartArea.bottom - MARKER_INSET - MARKER_SIZE - i * STACK_OFFSET,
            zIndex: i,
            isRadiant,
            iconUrl: '',
            title: `+${overflowCount} more`,
            isOverflow: true,
            overflowCount,
          })
        }
      }
      markers.value = newMarkers
      groupEvents.value = newGroupEvents
      // Skupina, na ktorú bol otvorený tooltip, mohla po resize/update zaniknúť
      // (iný bucketing) — zavri ho, nech nezostane "duch" tooltip bez markerov.
      if (activeGroupKey.value && !newMarkers.some((m) => m.groupKey === activeGroupKey.value)) {
        activeGroupKey.value = null
      }
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
          position: props.killMarkers?.length ? 'centerY' : 'average',
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

// Fallback pre touch: mouseleave tam spoľahlivo nenastane, takže po ťuknutí
// na ikonu (activeGroupKey nastavené cez @click) zavri skupinu aspoň klikom
// mimo markerov/tooltipu (tie majú @click.stop, takže sem neprebublá).
function handleOutsideClick() {
  cancelClose()
  activeGroupKey.value = null
}
onMounted(() => document.addEventListener('click', handleOutsideClick))
onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
  cancelClose()
  chart?.destroy()
})
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
    <div ref="chartScroll" class="chart-scroll" @scroll="updateViewportPixelBounds">
      <div
        :style="{
          height: `${height}px`,
          position: 'relative',
          minWidth: minChartWidth ? `${minChartWidth}px` : undefined,
        }"
      >
        <canvas ref="canvas"></canvas>
        <template v-for="m in markers" :key="m.key">
          <div
            v-if="m.isOverflow"
            class="kill-marker kill-marker-overflow"
            :style="{
              left: `${m.left}px`,
              top: `${m.top}px`,
              width: `${MARKER_SIZE}px`,
              height: `${MARKER_SIZE}px`,
              zIndex: m.groupKey === activeGroupKey ? markers.length : m.zIndex,
            }"
            @mouseenter="openGroup(m.groupKey)"
            @mouseleave="scheduleClose"
            @click.stop="openGroup(m.groupKey)"
          >
            +{{ m.overflowCount }}
          </div>
          <img
            v-else
            :src="m.iconUrl"
            :alt="m.title"
            class="kill-marker"
            :style="{
              left: `${m.left}px`,
              top: `${m.top}px`,
              width: `${MARKER_SIZE}px`,
              height: `${MARKER_SIZE}px`,
              zIndex: m.groupKey === activeGroupKey ? markers.length : m.zIndex,
            }"
            @mouseenter="openGroup(m.groupKey)"
            @mouseleave="scheduleClose"
            @click.stop="openGroup(m.groupKey)"
          />
        </template>
        <div
          v-if="activeGroupMarkers.length"
          class="kill-marker-tooltip"
          :class="activeGroupMarkers[0].isRadiant ? 'below' : 'above'"
          :style="{
            left: `${activeGroupTooltipLeft}px`,
            top: activeGroupMarkers[0].isRadiant
              ? `${Math.max(...activeGroupMarkers.map((m) => m.top)) + MARKER_SIZE + 6}px`
              : `${Math.min(...activeGroupMarkers.map((m) => m.top)) - 6}px`,
          }"
          @mouseenter="cancelClose"
          @mouseleave="scheduleClose"
          @click.stop
        >
          <div
            v-for="(evt, i) in activeGroupEvents"
            :key="`${evt.time}-${i}`"
            class="kill-marker-tooltip-row"
          >
            <TeamGlyph :side="evt.isRadiant ? 'radiant' : 'dire'" class="tooltip-glyph" />
            {{ evt.title }}
          </div>
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

.kill-marker-overflow {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-3, var(--surface-2));
  color: var(--muted);
  font-size: 9px;
  font-weight: var(--weight-semibold);
  line-height: 1;
  border: 1px solid var(--border-strong);
  cursor: pointer;
}

.kill-marker-tooltip {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  /* max-width musí sedieť s TOOLTIP_WIDTH v script setup — ten sa používa na
     pixel-clip pozície (nedovolí tooltipu presiahnuť okraj grafu), takže
     skutočná šírka sa s ním nesmie rozísť. */
  max-width: 240px;
  max-height: 9rem;
  overflow-y: auto;
  transform: translateX(-50%);
  background: var(--surface-2);
  color: var(--ink);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  padding: 0.35rem 0.55rem;
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  white-space: nowrap;
  /* Klikací zoznam killov (nie len hover-info ako predtým) — potrebuje
     pointer-events, aby @click.stop stihol zastaviť handleOutsideClick skôr,
     než klik "prepadne" na document a tooltip sa hneď zavrie. Scrollovateľné
     pre husté teamfighty s veľa killmi v jednom bucket-e. */
  pointer-events: auto;
  z-index: 10;
  box-shadow: var(--shadow-sm);
}

.kill-marker-tooltip-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
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
