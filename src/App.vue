<script setup lang="ts">
import { ACCOUNT_ID } from './config'
import SearchBox from './components/SearchBox.vue'
</script>

<template>
  <header class="topbar">
    <div class="container topbar-inner">
      <RouterLink to="/" class="brand">
        <!-- Zjednodušený Dota motív: štvorec + jedna diagonála (nie X, nech to nevyzerá ako close) -->
        <svg class="mark" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="1.5" y="1.5" width="21" height="21" rx="5" fill="#b83b34" />
          <path d="M6.5 6.5 L17.5 17.5" stroke="#fff" stroke-width="2.6" stroke-linecap="round" />
          <path d="M6.5 12.8 L6.5 6.5 L12.8 6.5" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none" stroke-linejoin="round" />
        </svg>
        Dota Stats
      </RouterLink>
      <nav>
        <RouterLink v-if="ACCOUNT_ID" :to="`/player/${ACCOUNT_ID}`">Môj profil</RouterLink>
        <RouterLink to="/leaderboard">Leaderboards</RouterLink>
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
  background: rgba(21, 23, 27, 0.82);
  backdrop-filter: blur(10px);
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
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-weight: 750;
  font-size: 1.05rem;
  color: var(--ink);
  letter-spacing: 0.01em;
}

.mark {
  width: 22px;
  height: 22px;
  display: block;
}

nav {
  display: flex;
  gap: 1.2rem;
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
