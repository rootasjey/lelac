<template>
  <WidgetCard title="Weather">
    <div v-if="loading" class="loading">
      Loading...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else-if="weather" class="weather">
      <div class="weather-current">
        <div class="weather-condition">{{ weather.current.condition }}</div>
        <div class="weather-feels">Feels Like {{ weather.current.feelsLike }}°C</div>
      </div>

      <div class="weather-chart">
        <div
          v-for="(hour, index) in filteredHours"
          :key="index"
          class="weather-bar-wrapper"
        >
          <div class="weather-bar">
            <div
              class="weather-bar-fill"
              :style="{ height: `${barHeight(hour.temperature)}px` }"
            />
          </div>
        </div>
      </div>

      <div class="weather-labels">
        <span v-for="(hour, index) in labelHours" :key="index" class="weather-label">
          {{ hour }}
        </span>
      </div>

      <div class="weather-location">
        <svg class="weather-location-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>{{ weather.location.name }}, {{ weather.location.country }}</span>
      </div>
    </div>
  </WidgetCard>
</template>

<script setup lang="ts">
interface WeatherData {
  current: {
    temperature: number
    feelsLike: number
    condition: string
    humidity: number
    windSpeed: number
  }
  hourly: Array<{
    time: string
    temperature: number
  }>
  location: {
    name: string
    country: string
  }
}

const weather = ref<WeatherData | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const editor = useEditorStore()

const props = withDefaults(defineProps<{
  lat?: number
  lon?: number
  locationName?: string
  locationCountry?: string
}>(), {
  lat: 51.5074,
  lon: -0.1278,
  locationName: 'London',
  locationCountry: 'United Kingdom',
})

const filteredHours = computed(() => {
  if (!weather.value) return []
  return weather.value.hourly.filter((_, i) => i % 3 === 0).slice(0, 8)
})

const labelHours = computed(() => {
  if (!weather.value) return []
  const hours = weather.value.hourly.filter((_, i) => i % 6 === 0).slice(0, 4)
  return hours.map(h => h.time?.toLowerCase())
})

function barHeight(temp: number): number {
  return Math.max(4, (temp + 5) * 2.5)
}

async function fetchWeather() {
  try {
    loading.value = true
    error.value = null

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${props.lat}&longitude=${props.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m&timezone=auto`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch weather')
    }

    const data = await response.json()

    const conditions: Record<number, string> = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail',
    }

      weather.value = {
        current: {
          temperature: Math.round(data.current.temperature_2m),
          feelsLike: Math.round(data.current.apparent_temperature),
          condition: conditions[data.current.weather_code] || 'Unknown',
          humidity: data.current.relative_humidity_2m,
          windSpeed: Math.round(data.current.wind_speed_10m),
        },
        hourly: data.hourly.time.slice(0, 24).map((time: string, i: number) => ({
          time: new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
          temperature: Math.round(data.hourly.temperature_2m[i]),
        })),
        location: {
          name: props.locationName,
          country: props.locationCountry,
        },
      }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to fetch weather'
    error.value = 'Failed to load'
    editor.logError('weather', msg)
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.lat, props.lon],
  () => fetchWeather(),
  { immediate: true },
)

watch(
  () => [props.locationName, props.locationCountry],
  ([name, country]) => {
    if (weather.value) {
      weather.value.location.name = name ?? 'Unknown'
      weather.value.location.country = country ?? ''
    }
  },
)
</script>

<style scoped>
.weather {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.weather-current {
  text-align: center;
}

.weather-condition {
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--text-primary);
}

.weather-feels {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.125rem;
}

.weather-chart {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 3px;
  height: 64px;
  padding: 0 0.5rem;
}

.weather-bar-wrapper {
  flex: 1;
  max-width: 16px;
  display: flex;
  justify-content: center;
}

.weather-bar {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
}

.weather-bar-fill {
  width: 100%;
  background-color: var(--weather-bar);
  border-radius: 2px 2px 0 0;
  transition: background-color 0.15s;
}

.weather-bar-wrapper:nth-child(4) .weather-bar-fill {
  background-color: var(--weather-bar-active);
}

.weather-labels {
  display: flex;
  justify-content: space-between;
  padding: 0 0.5rem;
}

.weather-label {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.625rem;
  color: var(--text-muted);
}

.weather-location {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.6875rem;
  color: var(--text-muted);
}

.weather-location-icon {
  width: 12px;
  height: 12px;
}

.loading,
.error {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.8125rem;
  color: var(--text-muted);
  text-align: center;
  padding: 1.5rem 0;
}

.error {
  color: var(--negative);
}
</style>
