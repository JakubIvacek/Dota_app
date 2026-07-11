<script setup lang="ts">
import { useAppLocale } from '../composables/useAppLocale'

const EFFECTIVE_DATE = '2026-07-11'
const { t } = useAppLocale()
</script>

<template>
  <div class="legal">
    <h1>{{ t('privacy.title') }}</h1>
    <p class="muted">{{ t('privacy.effectiveDate', { date: EFFECTIVE_DATE }) }}</p>

    <section>
      <h2>{{ t('privacy.noBackendTitle') }}</h2>
      <p>{{ t('privacy.noBackendBody') }}</p>
    </section>

    <section>
      <h2>{{ t('privacy.localStorageTitle') }}</h2>
      <i18n-t keypath="privacy.localStorageIntro" tag="p">
        <template #code><code>localStorage</code></template>
      </i18n-t>
      <ul>
        <li>{{ t('privacy.localStorageItem1') }}</li>
        <li>{{ t('privacy.localStorageItem2') }}</li>
        <li>{{ t('privacy.localStorageItem3') }}</li>
      </ul>
      <p>{{ t('privacy.localStorageOutro') }}</p>
    </section>

    <section>
      <h2>{{ t('privacy.noCookiesTitle') }}</h2>
      <p>{{ t('privacy.noCookiesBody') }}</p>
    </section>

    <section>
      <h2>{{ t('privacy.externalTitle') }}</h2>
      <i18n-t keypath="privacy.externalBody" tag="p">
        <template #opendota>
          <a href="https://www.opendota.com/" target="_blank" rel="noopener">OpenDota API</a>
        </template>
      </i18n-t>
    </section>

    <section>
      <h2>{{ t('privacy.contactTitle') }}</h2>
      <i18n-t keypath="privacy.contactBody" tag="p">
        <template #github>
          <a href="https://github.com/JakubIvacek/Dota_app" target="_blank" rel="noopener">GitHub</a>
        </template>
      </i18n-t>
    </section>
  </div>
</template>

<style scoped>
.legal {
  max-width: 640px;
  margin: 0 auto;
}

.legal h1 {
  margin-bottom: var(--space-1);
}

.legal section {
  margin-top: var(--space-6);
}

.legal h2 {
  font-size: var(--text-md);
  margin-bottom: var(--space-2);
}

.legal p,
.legal li {
  color: var(--ink-2);
  line-height: 1.65;
}

.legal ul {
  padding-left: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.legal a {
  color: var(--accent);
}

.legal code {
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  padding: 0.1rem 0.35rem;
  font-size: var(--text-sm);
}
</style>
