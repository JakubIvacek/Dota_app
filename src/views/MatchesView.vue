<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { GAME_MODES, gameModeName, getHeroMap, getMatches, wonMatch } from '../api/opendota'
import { useAsync } from '../composables/useAsync'
import { formatDuration, timeAgo } from '../utils/format'
import HeroIcon from '../components/HeroIcon.vue'
import type { PlayerMatch } from '../types/opendota'

const route = useRoute()
const router = useRouter()

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
</script>

<template>
  <div class="filters card">
    <label>
      Hero
      <select v-model="heroFilter">
        <option :value="null">Všetci</option>
        <option v-for="h in heroOptions" :key="h.id" :value="h.id">{{ h.localized_name }}</option>
      </select>
    </label>
    <label>
      Result
      <select v-model="resultFilter">
        <option value="all">Všetko</option>
        <option value="win">Výhry</option>
        <option value="loss">Prehry</option>
      </select>
    </label>
    <label>
      Mode
      <select v-model="modeFilter">
        <option :value="null">Všetky</option>
        <option v-for="m in modeOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
      </select>
    </label>
  </div>

  <p v-if="loading" class="muted">Loading…</p>
  <div v-else-if="error" class="error-box">Nepodarilo sa načítať matche: {{ error }}</div>
  <p v-else-if="!rows.length" class="muted">Žiadne matche nezodpovedajú filtru.</p>

  <div v-else class="card">
    <table class="data">
      <thead>
        <tr>
          <th>Hero</th>
          <th>Result</th>
          <th>K / D / A</th>
          <th class="num">Duration</th>
          <th>Mode</th>
          <th>Played</th>
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
          <td class="muted">{{ timeAgo(m.start_time) }}</td>
        </tr>
      </tbody>
    </table>

    <div ref="sentinel" class="scroll-footer">
      <span v-if="loadingMore" class="muted">Načítavam ďalšie…</span>
      <button v-else-if="hasMore" class="load-more" @click="loadPage(false)">
        Načítať ďalšie
      </button>
      <span v-else class="muted">Koniec histórie — {{ rows.length }} matchov.</span>
    </div>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 1.2rem;
  margin-bottom: 1rem;
  padding: 0.7rem 1.25rem;
}

.filters label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.filters select {
  background: var(--page);
  border: 1px solid var(--border);
  border-radius: 8px;
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
  border-radius: 8px;
  color: var(--ink-2);
  font: inherit;
  font-weight: 600;
  padding: 0.35rem 1rem;
  cursor: pointer;
}

.load-more:hover {
  border-color: var(--accent);
  color: var(--ink);
}
</style>
