<template>
  <div class="widget-wrapper">
    <h3 class="widget-title">{{ title }}</h3>
    <div class="widget-card">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<style scoped>
.widget-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.widget-title {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding-left: 1px;
}

.widget-card {
  background-color: var(--widget-bg);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  overflow: hidden;
  padding: 1rem;
}
</style>
