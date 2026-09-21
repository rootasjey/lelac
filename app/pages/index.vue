<script setup lang="ts">
const route = useRoute()
const dashboardId = computed(() => route.query.board === 'tech' ? 'tech' : 'daily')
const dashboardLabel = computed(() => dashboardId.value === 'tech' ? 'Tech' : 'Quotidien')
useHead(() => ({ title: `Encascade — ${dashboardLabel.value}` }))
</script>
<template><ClientOnly><BoardDashboard :dashboard-id="dashboardId" /><template #fallback><p class="dashboard-loading">Chargement de votre tableau…</p></template></ClientOnly></template>
<style scoped>.dashboard-loading { margin: 0; min-height: 100vh; padding: 32px; background: #141418; color: #e3e0e7; }</style>
