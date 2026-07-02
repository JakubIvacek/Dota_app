<script setup lang="ts">
import { ACCOUNT_ID } from './config'
</script>

<template>
  <header class="topbar">
    <div class="container topbar-inner">
      <RouterLink to="/" class="brand">Dota Stats</RouterLink>
      <nav>
        <RouterLink to="/">Dashboard</RouterLink>
        <RouterLink to="/matches">Matches</RouterLink>
        <RouterLink to="/heroes">Heroes</RouterLink>
      </nav>
    </div>
  </header>

  <main class="container">
    <div v-if="!ACCOUNT_ID" class="card setup">
      <h1>Chýba account ID</h1>
      <p>
        Vytvor v koreni projektu súbor <code>.env.local</code> a nastav svoje Dota 2
        account ID (Friend Code z profilu v hre):
      </p>
      <pre>VITE_ACCOUNT_ID=123456789</pre>
      <p class="muted">Potom reštartuj dev server (<code>npm run dev</code>).</p>
    </div>
    <RouterView v-else />
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
  gap: 2rem;
  padding-top: 0.7rem;
  padding-bottom: 0.7rem;
}

.brand {
  font-weight: 750;
  font-size: 1.05rem;
  color: var(--ink);
  letter-spacing: 0.01em;
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
  color: var(--ink);
}

nav a.router-link-exact-active {
  color: var(--accent);
}

.setup pre {
  background: var(--page);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.7rem 1rem;
}
</style>
