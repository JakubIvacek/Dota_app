<script setup lang="ts">
import { useAppLocale } from '../composables/useAppLocale'

const EFFECTIVE_DATE = '2026-07-11'
const { t } = useAppLocale()
</script>

<template>
  <div class="legal">
    <h1>{{ t('terms.title') }}</h1>
    <p class="muted">{{ t('terms.effectiveDate', { date: EFFECTIVE_DATE }) }}</p>

    <section>
      <h2>{{ t('terms.whatSectionTitle') }}</h2>
      <i18n-t keypath="terms.whatSectionBody" tag="p">
        <template #dota2><strong>Dota 2</strong></template>
        <template #steam><strong>Steam</strong></template>
      </i18n-t>
    </section>

    <section>
      <h2>{{ t('terms.dataSectionTitle') }}</h2>
      <i18n-t keypath="terms.dataSectionBody" tag="p">
        <template #opendota>
          <a href="https://www.opendota.com/" target="_blank" rel="noopener">OpenDota API</a>
        </template>
      </i18n-t>
    </section>

    <section>
      <h2>{{ t('terms.warrantySectionTitle') }}</h2>
      <p>{{ t('terms.warrantySectionBody') }}</p>
    </section>

    <section>
      <h2>{{ t('terms.contactSectionTitle') }}</h2>
      <i18n-t keypath="terms.contactSectionBody" tag="p">
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

.legal p {
  color: var(--ink-2);
  line-height: 1.65;
}

.legal a {
  color: var(--accent);
}
</style>
