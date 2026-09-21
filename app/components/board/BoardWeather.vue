<script setup lang="ts">
import type { BoardWidget } from '~/utils/boardConfig'
const props = defineProps<{ location: NonNullable<BoardWidget['location']> }>()
interface Weather { temperature: number; feelsLike: number; code: number; min: number; max: number; fetchedAt: string }
const { value, loading, error, refresh } = useBoardSource<Weather>(() => `weather:${props.location.lat}:${props.location.lon}`, () => $fetch('/api/sources/weather', { query: { lat: props.location.lat, lon: props.location.lon } }))
const condition = computed(() => {
  const code = value.value?.code ?? -1
  if (code === 0) return 'Ciel dégagé'
  if (code <= 2 && code >= 0) return 'Éclaircies'
  if (code === 3) return 'Couvert'
  if ([45, 48].includes(code)) return 'Brouillard'
  if (code >= 95) return 'Orage'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Neige'
  if (code >= 51 && code <= 82) return 'Pluie'
  return 'Conditions indisponibles'
})
</script>
<template>
  <div class="live-weather" :aria-busy="loading">
    <p v-if="!value && loading" role="status">Chargement de la météo…</p>
    <p v-else-if="!value && error" role="alert">Météo indisponible. <button @click="refresh()">Réessayer</button></p>
    <template v-if="value">
      <div class="weather-summary"><span class="temperature">{{ value.temperature }}°</span><div><p>{{ condition }}</p><span>{{ location.name }}</span></div></div>
      <p class="feels">Ressenti {{ value.feelsLike }}° · {{ value.min }}° / {{ value.max }}°</p>
      <p v-if="error" class="stale" role="status">Actualisation impossible · dernières données conservées.</p>
    </template>
    <footer><a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a><span v-if="value">{{ new Date(value.fetchedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }}</span></footer>
  </div>
</template>
<style scoped>
.live-weather { height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 16px; font-size: 12px; min-height: 0; }
p { margin: 0; }
.weather-summary { display: flex; align-items: center; gap: 16px; margin-top: auto; }
.weather-summary > div { min-width: 0; }
.weather-summary span:not(.temperature) { display: block; margin-top: 6px; color: #aaa7b2; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.temperature { font-size: 42px; letter-spacing: -2px; }
.feels, .stale { color: #aaa7b2; font-size: 11px; }
footer { margin-top: auto; display: flex; gap: 12px; align-items: center; font-size: 10px; color: #aaa7b2; min-height: 44px; }
footer a { color: inherit; }
button { background: transparent; color: #d8c58f; border: 0; cursor: pointer; min-width: 40px; min-height: 40px; }
button:focus-visible { outline: 2px solid #d8c58f; }
</style>
