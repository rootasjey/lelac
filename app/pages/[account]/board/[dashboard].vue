<script setup lang="ts">
const route = useRoute()
const dashboard = computed(() => typeof route.params.dashboard === 'string' ? route.params.dashboard : '')
</script>

<template><AccountDashboardRoute :dashboard="dashboard" /></template>
