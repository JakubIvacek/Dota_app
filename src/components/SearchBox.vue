<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { extractAccountId } from '../utils/accountId'

const { t } = useI18n()
const router = useRouter()
const query = ref('')
const submitting = ref(false)

async function submit() {
  const q = query.value.trim()
  if (!q || submitting.value) return
  query.value = ''
  submitting.value = true
  try {
    // Číselné ID, alebo ID vytiahnuté z prilepeného profilového linku
    // (Steam/Dotabuff/OpenDota/Stratz), berieme rovno ako account ID —
    // OpenDota /search je nespoľahlivý, takže priama navigácia je istejšia.
    const accountId = extractAccountId(q)
    if (accountId) {
      await router.push(`/player/${accountId}`)
    } else {
      await router.push({ name: 'search', query: { q } })
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="search" @submit.prevent="submit">
    <svg class="icon" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="9" cy="9" r="6.25" fill="none" stroke="currentColor" stroke-width="1.6" />
      <line x1="13.6" y1="13.6" x2="18" y2="18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
    </svg>
    <input
      v-model="query"
      type="search"
      :placeholder="t('searchbox.placeholder')"
      :aria-label="t('searchbox.ariaLabel')"
    />
    <button type="submit" :disabled="submitting" :class="{ pending: submitting }">
      <span v-if="submitting" class="spinner" aria-hidden="true" />
      <span :class="{ 'sr-only': submitting }">{{ t('searchbox.submit') }}</span>
    </button>
  </form>
</template>

<style scoped>
.search {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: linear-gradient(180deg, var(--surface-2), var(--surface));
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  padding: 3px 3px 3px 0.15rem;
  box-shadow: var(--shadow-sm);
  transition: border-color var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out);
}

.search:focus-within {
  border-color: var(--accent);
  box-shadow: var(--shadow-glow-accent);
}

.icon {
  flex-shrink: 0;
  width: 15px;
  height: 15px;
  margin-left: 0.55rem;
  color: var(--muted);
  pointer-events: none;
  transition: color var(--duration-fast) var(--ease-out);
}

.search:focus-within .icon {
  color: var(--accent);
}

input {
  background: transparent;
  border: none;
  color: var(--ink);
  padding: 0.4rem 0.5rem;
  font: inherit;
  width: 180px;
  min-width: 0;
  flex: 1;
}

input::placeholder {
  color: var(--muted);
}

input:focus {
  outline: none;
}

button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--accent);
  border: none;
  border-radius: var(--radius-pill);
  color: #fff;
  font: inherit;
  font-weight: var(--weight-semibold);
  padding: 0.4rem 0.75rem;
  cursor: pointer;
}

button:hover {
  filter: brightness(1.1);
}

button:disabled {
  cursor: default;
  filter: none;
  opacity: 0.85;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.spinner {
  width: 0.95em;
  height: 0.95em;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: search-spin 0.7s linear infinite;
}

@keyframes search-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .spinner { animation-duration: 1.4s; }
}
</style>
