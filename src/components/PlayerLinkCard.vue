<script setup lang="ts">
defineProps<{
  accountId: string
  personaname: string
  avatarfull: string
  sub?: string
}>()
</script>

<template>
  <RouterLink :to="`/player/${accountId}`" class="card player-link">
    <img :src="avatarfull" alt="" />
    <div>
      <div class="player-name">{{ personaname }}</div>
      <div v-if="sub" class="muted small">{{ sub }}</div>
    </div>
  </RouterLink>
</template>

<style scoped>
.player-link {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.6rem 0.8rem;
  color: var(--ink);
  text-align: left;
}

.player-link:hover {
  border-color: var(--accent);
}

.player-link img {
  width: 40px;
  height: 40px;
  border-radius: 8px;
}

.player-name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}

.small {
  font-size: 0.8rem;
}
</style>
