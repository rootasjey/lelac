<template>
  <div class="widget-card">
    <div class="widget-card-header">
      <h3 class="widget-title">
        {{ title }}
      </h3>
    </div>
    <div class="widget-card-body">
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
.widget-card {
  background-color: var(--widget-bg);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  overflow: hidden;
}

.widget-card-header {
  padding: 0.75rem 1rem 0;
}

.widget-card-body {
  padding: 0.5rem 1rem 1rem;
}
</style>
