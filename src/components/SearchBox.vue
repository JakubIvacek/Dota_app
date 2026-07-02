<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

withDefaults(defineProps<{ size?: 'normal' | 'large' }>(), { size: 'normal' })

const router = useRouter()
const query = ref('')

function submit() {
  const q = query.value.trim()
  if (!q) return
  query.value = ''
  // Číselný vstup berieme rovno ako account ID (Friend Code), inak fulltext search.
  if (/^\d+$/.test(q)) {
    router.push(`/player/${q}`)
  } else {
    router.push({ name: 'search', query: { q } })
  }
}
</script>

<template>
  <form class="search" :class="size" @submit.prevent="submit">
    <input
      v-model="query"
      type="search"
      placeholder="Meno hráča alebo Dota ID…"
      :aria-label="'Hľadať hráča'"
    />
    <button type="submit">Hľadať</button>
  </form>
</template>

<style scoped>
.search {
  display: flex;
  gap: 0.5rem;
}

input {
  background: var(--page);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--ink);
  padding: 0.4rem 0.7rem;
  font: inherit;
  width: 220px;
}

input:focus {
  outline: none;
  border-color: var(--accent);
}

button {
  background: var(--accent);
  border: none;
  border-radius: 8px;
  color: #fff;
  font: inherit;
  font-weight: 600;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
}

button:hover {
  filter: brightness(1.1);
}

.large input {
  width: min(420px, 60vw);
  padding: 0.6rem 0.9rem;
  font-size: 1.05rem;
}

.large button {
  padding: 0.6rem 1.2rem;
  font-size: 1.05rem;
}
</style>
