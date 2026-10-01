<script setup lang="ts">
import type { City } from '~/utils/boardConfig'
defineProps<{ cities: City[] }>()
const now = ref(new Date())
let timer: ReturnType<typeof setInterval>
onMounted(() => { timer = setInterval(() => { now.value = new Date() }, 1000) })
onBeforeUnmount(() => clearInterval(timer))
function time(zone: string) { return new Intl.DateTimeFormat('fr-FR', { timeZone: zone, hour: '2-digit', minute: '2-digit' }).format(now.value) }
function day(zone: string) { return new Intl.DateTimeFormat('fr-FR', { timeZone: zone, weekday: 'short', day: 'numeric', month: 'short' }).format(now.value) }
</script>
<template><div class="world-clocks"><div v-for="(city, index) in cities" :key="index"><div><span>{{ city.name }}</span><small>{{ day(city.timezone) }}</small></div><time>{{ time(city.timezone) }}</time></div></div></template>
<style scoped>
.world-clocks { height: 100%; display: flex; flex-direction: column; padding-bottom: 12px; }
.world-clocks > div { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid var(--board-border); }
.world-clocks > div:last-child { border: 0; }
.world-clocks span { color: var(--board-text-soft); font-size: 12px; overflow-wrap: anywhere; }
.world-clocks small { display: block; color: var(--board-text-muted); font-size: 10px; margin-top: 5px; }
.world-clocks time { font-size: 24px; color: var(--board-accent); font-variant-numeric: tabular-nums; }
</style>
