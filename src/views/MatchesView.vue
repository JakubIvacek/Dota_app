<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  GAME_MODES,
  gameModeName,
  getHeroMap,
  getMatches,
  requestPlayerRefresh,
  wonMatch,
} from '../api/opendota'
import { useAsync } from '../composables/useAsync'
import { formatDuration, timeAgo } from '../utils/format'
import { useAppLocale } from '../composables/useAppLocale'
import HeroIcon from '../components/HeroIcon.vue'
import Skeleton from '../components/Skeleton.vue'
import type { PlayerMatch } from '../types/opendota'

const route = useRoute()
const router = useRouter()
const { t, intlLocale } = useAppLocale()

// Filtre — null = bez filtra. Zmena resetne zoznam a načíta prvú stránku.
const heroFilter = ref<number | null>(null)
const resultFilter = ref<'all' | 'win' | 'loss'>('all')
const modeFilter = ref<number | null>(null)

const { data: heroMap } = useAsync(() => getHeroMap())

/**
 * Infinite scroll — OpenDota stránkuje cez limit/offset. Prvá stránka má
 * vlastný loading (vymení obsah), ďalšie sa lepia na koniec zoznamu.
 */
const PAGE = 50
const matches = ref<PlayerMatch[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const error = ref<string | null>(null)
const hasMore = ref(true)

// Ochrana pred pretekom odpovedí: platí len posledný vyslaný request.
let requestSeq = 0

async function loadPage(reset: boolean) {
  const seq = ++requestSeq
  if (reset) {
    loading.value = true
    error.value = null
    hasMore.value = true
  } else {
    loadingMore.value = true
  }
  try {
    const page = await getMatches(String(route.params.accountId), {
      limit: PAGE,
      offset: reset ? 0 : matches.value.length,
      hero_id: heroFilter.value ?? undefined,
      win: resultFilter.value === 'all' ? undefined : resultFilter.value === 'win' ? 1 : 0,
      game_mode: modeFilter.value ?? undefined,
    })
    if (seq !== requestSeq) return
    matches.value = reset ? page : [...matches.value, ...page]
    hasMore.value = page.length === PAGE
  } catch (e) {
    if (seq !== requestSeq) return
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    if (seq === requestSeq) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

watch(
  [heroFilter, resultFilter, modeFilter, () => route.params.accountId],
  () => loadPage(true),
  { immediate: true },
)

// Sentinel pod tabuľkou — keď sa priblíži do viewportu, doťiahni ďalšiu stránku.
const sentinel = ref<HTMLElement | null>(null)
const observer = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting && hasMore.value && !loading.value && !loadingMore.value) {
      loadPage(false)
    }
  },
  { rootMargin: '600px' },
)

watch(sentinel, (el, _, onCleanup) => {
  if (!el) return
  observer.observe(el)
  onCleanup(() => observer.unobserve(el))
})

onBeforeUnmount(() => observer.disconnect())

const heroOptions = computed(() =>
  [...(heroMap.value?.values() ?? [])].sort((a, b) =>
    a.localized_name.localeCompare(b.localized_name),
  ),
)

const modeOptions = Object.entries(GAME_MODES).map(([id, name]) => ({
  id: Number(id),
  name,
}))

const RESULT_OPTIONS = computed<{ value: 'all' | 'win' | 'loss'; label: string }[]>(() => [
  { value: 'all', label: t('matches.resultAll') },
  { value: 'win', label: t('matches.resultWin') },
  { value: 'loss', label: t('matches.resultLoss') },
])

const rows = computed(() =>
  (matches.value ?? []).map((m) => ({
    ...m,
    hero: heroMap.value?.get(m.hero_id),
    won: wonMatch(m),
  })),
)

function openMatch(matchId: number) {
  // ?player= — nech match detail vie, koho riadok zvýrazniť.
  router.push({ path: `/matches/${matchId}`, query: { player: String(route.params.accountId) } })
}

// Bez filtrov + prázdny zoznam = OpenDota tohto hráča ešte nezaindexovala,
// nie "žiadne matche podľa filtra". Ponúkni refresh, nie tichý slepý koniec.
const noFiltersActive = computed(
  () => heroFilter.value === null && resultFilter.value === 'all' && modeFilter.value === null,
)

const refreshing = ref(false)
const refreshError = ref<string | null>(null)

async function refreshFromOpenDota() {
  refreshing.value = true
  refreshError.value = null
  try {
    await requestPlayerRefresh(String(route.params.accountId))
    await loadPage(true)
  } catch (e) {
    refreshError.value = e instanceof Error ? e.message : String(e)
  } finally {
    refreshing.value = false
  }
}
</script>

<template>
  <div class="filters card">
    <label>
      {{ t('matches.filterHero') }}
      <select v-model="heroFilter">
        <option :value="null">{{ t('matches.filterHeroAll') }}</option>
        <option v-for="h in heroOptions" :key="h.id" :value="h.id">{{ h.localized_name }}</option>
      </select>
    </label>
    <label>
      {{ t('matches.filterMode') }}
      <select v-model="modeFilter">
        <option :value="null">{{ t('matches.filterModeAll') }}</option>
        <option v-for="m in modeOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
      </select>
    </label>
    <div class="result-toggle" role="group" :aria-label="t('matches.resultGroupLabel')">
      <button
        v-for="opt in RESULT_OPTIONS"
        :key="opt.value"
        type="button"
        class="result-btn"
        :class="[opt.value, { active: resultFilter === opt.value }]"
        @click="resultFilter = opt.value"
      >
        {{ opt.label }}
      </button>
    </div>
  </div>

  <section v-if="loading" class="card skeleton-stack">
    <Skeleton v-for="i in 8" :key="i" variant="row" height="40px" />
  </section>
  <div v-else-if="error" class="error-box">{{ t('matches.errorLoad', { error }) }}</div>

  <div v-else-if="!rows.length && noFiltersActive" class="card empty-state">
    <p class="muted">{{ t('matches.notIndexedText') }}</p>
    <button class="refresh-btn" :disabled="refreshing" @click="refreshFromOpenDota">
      {{ refreshing ? t('matches.refreshRequesting') : t('matches.refreshIdle') }}
    </button>
    <p v-if="refreshError" class="error-box">{{ refreshError }}</p>
  </div>
  <p v-else-if="!rows.length" class="muted">{{ t('matches.emptyFiltered') }}</p>

  <div v-else class="card">
    <table class="data">
      <thead>
        <tr>
          <th>Hero</th>
          <th>{{ t('matches.colResult') }}</th>
          <th>K / D / A</th>
          <th class="num">{{ t('matches.colDuration') }}</th>
          <th>{{ t('matches.colMode') }}</th>
          <th>{{ t('matches.colPlayed') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in rows" :key="m.match_id" class="clickable" @click="openMatch(m.match_id)">
          <td><HeroIcon :hero="m.hero" /></td>
          <td>
            <span class="badge" :class="m.won ? 'win' : 'loss'">{{ m.won ? 'W' : 'L' }}</span>
          </td>
          <td>{{ m.kills }} / {{ m.deaths }} / {{ m.assists }}</td>
          <td class="num">{{ formatDuration(m.duration) }}</td>
          <td>{{ gameModeName(m.game_mode) }}</td>
          <td class="muted">{{ timeAgo(m.start_time, intlLocale) }}</td>
        </tr>
      </tbody>
    </table>

    <div ref="sentinel" class="scroll-footer">
      <span v-if="loadingMore" class="muted">{{ t('matches.loadingMore') }}</span>
      <button v-else-if="hasMore" class="load-more" @click="loadPage(false)">
        {{ t('matches.loadMore') }}
      </button>
      <span v-else class="muted">{{ t('matches.endOfHistory', { n: rows.length }, rows.length) }}</span>
    </div>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.2rem;
  margin-bottom: var(--space-4);
  padding: 0.7rem 1.25rem;
}

.result-toggle {
  display: inline-flex;
  gap: 2px;
  margin-left: auto;
  padding: 3px;
  background: var(--page);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
}

.result-btn {
  background: none;
  border: none;
  color: var(--muted);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  padding: 0.3rem 0.85rem;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out);
}

.result-btn:hover {
  color: var(--ink);
}

.result-btn.active {
  background: var(--surface-3);
  color: var(--ink);
}

.result-btn.win.active { color: var(--win); }
.result-btn.loss.active { color: var(--loss); }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
}

.refresh-btn {
  background: var(--accent);
  border: none;
  border-radius: var(--radius-md);
  color: #fff;
  font: inherit;
  font-weight: var(--weight-semibold);
  padding: 0.45rem 1rem;
  cursor: pointer;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.refresh-btn:hover {
  opacity: 0.9;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.filters label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--text-sm);
  color: var(--muted);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

.filters select {
  background: var(--page);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--ink);
  font: inherit;
  text-transform: none;
  letter-spacing: normal;
  font-weight: 400;
  padding: 0.35rem 0.6rem;
}

.filters select:focus {
  outline: none;
  border-color: var(--accent);
}

.scroll-footer {
  display: flex;
  justify-content: center;
  padding: 0.9rem 0 0.2rem;
  font-size: 0.9rem;
}

/* Fallback pre prípad, že IntersectionObserver nestihne / nezaberie. */
.load-more {
  background: var(--surface-2);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--ink-2);
  font: inherit;
  font-weight: var(--weight-semibold);
  padding: 0.35rem 1rem;
  cursor: pointer;
}

.load-more:hover {
  border-color: var(--accent);
  color: var(--ink);
}
</style>
