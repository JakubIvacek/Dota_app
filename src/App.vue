<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Analytics } from '@vercel/analytics/vue'
import { ACCOUNT_ID } from './config'
import { SUPPORTED_LOCALES, persistLocale, type LocaleCode } from './i18n'
import SearchBox from './components/SearchBox.vue'
import TopProgressBar from './components/TopProgressBar.vue'

const { t, locale } = useI18n()

function onLocaleChange(e: Event) {
  const code = (e.target as HTMLSelectElement).value as LocaleCode
  locale.value = code
  persistLocale(code)
}
</script>

<template>
  <TopProgressBar />

  <header class="topbar">
    <div class="container topbar-inner">
      <RouterLink to="/" class="brand">
        <img class="mark" src="/logo/logo.svg" alt="" width="24" height="24" />
        Dota Stats
      </RouterLink>
      <nav>
        <RouterLink v-if="ACCOUNT_ID" :to="`/player/${ACCOUNT_ID}`">{{ t('app.nav.profile') }}</RouterLink>
        <RouterLink to="/leaderboard">{{ t('app.nav.leaderboards') }}</RouterLink>
      </nav>
      <select class="locale-select" :value="locale" aria-label="Language" @change="onLocaleChange">
        <option v-for="l in SUPPORTED_LOCALES" :key="l.code" :value="l.code">{{ l.label }}</option>
      </select>
      <SearchBox class="topbar-search" />
    </div>
  </header>

  <main class="container">
    <RouterView />
  </main>

  <footer class="footer">
    <div class="container footer-inner">
      <RouterLink to="/" class="footer-brand">
        <img class="footer-mark" src="/logo/logo.svg" alt="" width="18" height="18" />
        Dota Stats
      </RouterLink>

      <i18n-t keypath="app.footer.disclaimer" tag="p" class="footer-disclaimer">
        <template #link>
          <a href="https://www.opendota.com/" target="_blank" rel="noopener">OpenDota API</a>
        </template>
      </i18n-t>

      <nav class="footer-links">
        <a href="https://github.com/JakubIvacek/Dota_app" target="_blank" rel="noopener">{{ t('app.footer.github') }}</a>
        <RouterLink to="/terms">{{ t('app.footer.terms') }}</RouterLink>
        <RouterLink to="/privacy">{{ t('app.footer.privacy') }}</RouterLink>
      </nav>

      <span class="footer-copy muted">© {{ new Date().getFullYear() }}</span>
    </div>
  </footer>

  <Analytics />
</template>

<style scoped>
.topbar {
  background: rgba(11, 12, 14, 0.72);
  backdrop-filter: blur(14px) saturate(1.3);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

.topbar-inner {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  padding-top: 0.7rem;
  padding-bottom: 0.7rem;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font-family: var(--font-display);
  font-weight: var(--weight-bold);
  font-size: 1.1rem;
  color: var(--ink);
  letter-spacing: var(--tracking-tight);
  transition: opacity var(--duration-fast) var(--ease-out);
}

.brand:hover {
  opacity: 0.85;
}

.mark {
  width: 24px;
  height: 24px;
  display: block;
  filter: drop-shadow(0 2px 6px rgba(4, 6, 12, 0.4));
}

nav {
  display: flex;
  gap: var(--space-2);
}

nav a {
  position: relative;
  color: var(--ink-2);
  font-weight: var(--weight-medium);
  font-size: var(--text-sm);
  padding: 0.4rem 0.15rem;
  transition: color var(--duration-fast) var(--ease-out);
}

nav a::after {
  content: '';
  position: absolute;
  left: 0;
  right: 100%;
  bottom: -2px;
  height: 2px;
  border-radius: var(--radius-pill);
  background: var(--accent);
  transition: right var(--duration-normal) var(--ease-out);
}

nav a:hover {
  color: var(--ink);
}

nav a.router-link-active {
  color: var(--ink);
}

nav a.router-link-active::after {
  right: 0;
}

.locale-select {
  margin-left: auto;
  background: var(--page);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--ink-2);
  font: inherit;
  font-size: var(--text-sm);
  padding: 0.3rem 0.5rem;
  cursor: pointer;
  transition: border-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out);
}

.locale-select:hover {
  color: var(--ink);
}

.locale-select:focus-visible {
  outline: none;
  border-color: var(--accent);
}

.topbar-search {
  margin-left: 0;
}

.footer {
  border-top: 1px solid var(--border);
  background: var(--surface);
  margin-top: var(--space-8);
}

.footer-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-6);
  padding-top: var(--space-4);
  padding-bottom: var(--space-4);
}

.footer-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-family: var(--font-display);
  font-weight: var(--weight-semibold);
  font-size: var(--text-sm);
  color: var(--ink-2);
  transition: color var(--duration-fast) var(--ease-out);
}

.footer-brand:hover {
  color: var(--ink);
}

.footer-mark {
  width: 18px;
  height: 18px;
  display: block;
  opacity: 0.9;
}

.footer-disclaimer {
  flex: 1 1 260px;
  margin: 0;
  color: var(--muted);
  font-size: var(--text-xs);
  line-height: 1.5;
}

.footer-disclaimer a {
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color var(--duration-fast) var(--ease-out);
}

.footer-disclaimer a:hover {
  color: var(--ink-2);
}

.footer-links {
  display: flex;
  gap: var(--space-4);
}

.footer-links a {
  color: var(--ink-2);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  transition: color var(--duration-fast) var(--ease-out);
}

.footer-links a:hover {
  color: var(--ink);
}

.footer-copy {
  font-size: var(--text-xs);
}
</style>
