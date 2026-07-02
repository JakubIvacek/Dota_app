import { ref, watchEffect, type Ref } from 'vue'

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
    try {
      data.value = await loader()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  })

  return { data, loading, error }
}
