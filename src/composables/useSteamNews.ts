import { getDotaNews } from '../api/steamNews'
import { useAsync } from './useAsync'

/** Shared by HomeView's "Latest updates" preview and UpdatesView's full list —
 * fetches once (cached by useAsync/fetchJsonFromUrl), consumers slice as needed. */
export function useSteamNews() {
  return useAsync(() => getDotaNews(10))
}
