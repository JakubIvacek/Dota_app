<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { routeLoading } from '../composables/useNavProgress'
import { useGlobalLoading } from '../composables/useAsync'

/** Route-transition latency (chunk fetch) OR any in-flight useAsync request
 * (OpenDota latency) — either one keeps the bar visible. */
const globalLoading = useGlobalLoading()
const anyLoading = computed(() => routeLoading.value || globalLoading.value)
const visible = ref(false)

// Delay-show avoids a flash/flicker on fast (<150ms) responses.
const SHOW_DELAY = 150
let showTimer: ReturnType<typeof setTimeout> | undefined
let hideTimer: ReturnType<typeof setTimeout> | undefined

watch(
  anyLoading,
  (loading) => {
    clearTimeout(showTimer)
    clearTimeout(hideTimer)
    if (loading) {
      showTimer = setTimeout(() => {
        visible.value = true
      }, SHOW_DELAY)
    } else if (visible.value) {
      // Let the bar reach "done" before it fades, so it never just vanishes mid-sweep.
      hideTimer = setTimeout(() => {
        visible.value = false
      }, 200)
    } else {
      visible.value = false
    }
  },
)

onBeforeUnmount(() => {
  clearTimeout(showTimer)
  clearTimeout(hideTimer)
})
</script>

<template>
  <div class="top-progress" :class="{ visible }" aria-hidden="true" />
</template>

<style scoped>
.top-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  z-index: var(--z-overlay);
  background: var(--accent);
  box-shadow: var(--shadow-glow-accent);
  transform-origin: left;
  transform: scaleX(0);
  opacity: 0;
  transition: opacity var(--duration-normal) var(--ease-out);
}

.top-progress.visible {
  opacity: 1;
  animation: top-progress-sweep 1.1s var(--ease-out) infinite;
}

@keyframes top-progress-sweep {
  0% { transform: scaleX(0); }
  55% { transform: scaleX(0.6); }
  100% { transform: scaleX(0.88); }
}

@media (prefers-reduced-motion: reduce) {
  .top-progress.visible {
    animation: none;
    transform: scaleX(0.6);
  }
}
</style>
