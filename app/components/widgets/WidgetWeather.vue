<template>
  <WidgetCard title="Weather">
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="text-muted text-sm">Loading...</div>
    </div>
    
    <div v-else-if="error" class="flex items-center justify-center py-8">
      <div class="text-red-400 text-sm">{{ error }}</div>
    </div>
    
    <div v-else-if="weather" class="space-y-4">
      <div class="text-center">
        <div class="text-xl md:text-2xl font-medium text-primary">{{ weather.current.condition }}</div>
        <div class="text-sm text-muted">Feels Like {{ weather.current.feelsLike }}°C</div>
      </div>
      
      <div class="flex items-end justify-center gap-[2px] md:gap-[3px] h-16 md:h-20">
        <div
          v-for="(hour, index) in weather.hourly.filter((_, i) => i % 3 === 0)"
          :key="index"
          class="flex flex-col items-center"
        >
          <div
            class="w-2 md:w-3 rounded-t"
            :style="{
              height: `${Math.max(4, (hour.temperature + 5) * 3)}px`,
              backgroundColor: 'var(--weather-bar)',
            }"
          />
        </div>
      </div>

      <div class="flex items-center justify-center gap-1 text-xs text-muted">
        <span v-for="(hour, index) in weather.hourly.filter((_, i) => i % 6 === 0)" :key="index" class="w-12 text-center">
          {{ hour.time?.toLowerCase() }}
        </span>
      </div>

      <div class="flex items-center justify-center gap-1 text-xs text-muted">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
const { isDark } = useTheme()

async function fetchWeather() {
  try {
    loading.value = true
    error.value = null
    
    // Use Open-Meteo API (no key needed)
    const response = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=51.5074&longitude=-0.1278&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m&timezone=auto'
    )
    
    if (!response.ok) {
      throw new Error('Failed to fetch weather')
    }
    
    const data = await response.json()
    
    // Map weather code to condition
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
        name: 'London',
        country: 'United Kingdom',
      },
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to fetch weather'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchWeather()
})
</script>
