<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ACCOUNT_ID } from '../config'
import SearchBox from '../components/SearchBox.vue'

const router = useRouter()

// Ak je nastavené vlastné ID, domov = vlastný profil.
if (ACCOUNT_ID) {
  router.replace(`/player/${ACCOUNT_ID}`)
}
</script>

<template>
  <div v-if="!ACCOUNT_ID" class="landing">
    <h1>Dota Stats</h1>
    <p class="muted">
      Zadaj meno hráča alebo Dota account ID (Friend Code) a pozri si štatistiky.
    </p>
    <SearchBox size="large" />
    <p class="muted hint">
      Tip: vlastný profil si nastavíš cez <code>VITE_ACCOUNT_ID</code> v
      <code>.env.local</code> — potom sa zobrazí rovno po otvorení appky.
    </p>
  </div>
</template>

<style scoped>
.landing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 14vh 1rem 0;
  text-align: center;
}

.landing h1 {
  font-size: 2.2rem;
}

.hint {
  font-size: 0.85rem;
}
</style>
