<script setup lang="ts">
import { ACCOUNT_ID } from './config'
import SearchBox from './components/SearchBox.vue'
</script>

<template>
  <header class="topbar">
    <div class="container topbar-inner">
      <RouterLink to="/" class="brand">Dota Stats</RouterLink>
      <nav v-if="ACCOUNT_ID">
        <RouterLink :to="`/player/${ACCOUNT_ID}`">Môj profil</RouterLink>
      </nav>
      <SearchBox class="topbar-search" />
    </div>
  </header>

  <main class="container">
    <RouterView />
  </main>
</template>

<style scoped>
.topbar {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.topbar-inner {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding-top: 0.6rem;
  padding-bottom: 0.6rem;
}

.brand {
  font-weight: 750;
  font-size: 1.05rem;
  color: var(--ink);
  letter-spacing: 0.01em;
}

nav a {
  color: var(--ink-2);
  font-weight: 500;
}

nav a.router-link-active {
  color: var(--accent);
}

.topbar-search {
  margin-left: auto;
}
</style>
