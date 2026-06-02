<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <div class="bg-widget border border-primary rounded overflow-hidden">
    <div class="px-3 md:px-4 py-2.5 md:py-3">
      <h3 class="widget-title">
        {{ title }}
      </h3>
    </div>
    <div class="px-3 md:px-4 pb-3 md:pb-4">
      <slot />
    </div>
  </div>
</template>
