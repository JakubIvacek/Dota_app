import { ref } from 'vue'

/** True kým router rieši navigáciu (lazy chunk fetch + resolve guardov).
 * Nastavuje sa v router.ts, číta sa v TopProgressBar.vue. */
export const routeLoading = ref(false)
