import { computed, ref, watchEffect, type Ref } from 'vue'

// Globálny počet bežiacich useAsync požiadaviek — pohania top-of-page
// progress bar, nech je vidno aj OpenDota latenciu, nielen prechod medzi routami.
//
// `rawPendingCount` drží skutočnú hodnotu; `pendingCount` je len jej reaktívna
// projekcia. Dôležité: vnútri watchEffect nižšie sa do `pendingCount.value`
// vždy len ZAPISUJE (nikdy `pendingCount.value++`) — čítanie vlastnej hodnoty
// v synchrónnej (trackovanej) časti watchEffect by naň effect nabindovalo ako
// závislosť a zápis by ho okamžite znova spustil → nekonečná slučka.
let rawPendingCount = 0
const pendingCount = ref(0)

export function useGlobalLoading() {
  return computed(() => pendingCount.value > 0)
}

/**
 * Spustí async loader a vystaví data/loading/error. Loader beží v rámci
 * watchEffect, takže sa automaticky re-spustí, keď sa zmení reaktívna
 * závislosť použitá vnútri (napr. route param).
 */
export function useAsync<T>(loader: () => Promise<T>) {
  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(true)
  const error = ref<string | null>(null)

  watchEffect(async () => {
    loading.value = true
    error.value = null
    rawPendingCount++
    pendingCount.value = rawPendingCount
    try {
      data.value = await loader()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
      rawPendingCount--
      pendingCount.value = rawPendingCount
    }
  })

  return { data, loading, error }
}
