<template>
  <WidgetCard title="Clock">
    <div class="flex flex-col items-center gap-4">
      <!-- Analog Clock -->
      <div class="relative w-24 h-24 md:w-32 md:h-32">
        <svg viewBox="0 0 100 100" class="w-full h-full">
          <!-- Clock face -->
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" class="text-muted" stroke-width="2" />
          
          <!-- Hour markers -->
          <g v-for="i in 12" :key="i">
            <line
              :x1="50 + 38 * Math.cos((i * 30 - 90) * Math.PI / 180)"
              :y1="50 + 38 * Math.sin((i * 30 - 90) * Math.PI / 180)"
              :x2="50 + 42 * Math.cos((i * 30 - 90) * Math.PI / 180)"
              :y2="50 + 42 * Math.sin((i * 30 - 90) * Math.PI / 180)"
              stroke="currentColor"
              class="text-muted"
              stroke-width="2"
            />
          </g>
          
          <!-- Hour hand -->
          <line
            x1="50"
            y1="50"
            :x2="50 + 25 * Math.cos((hourRotation - 90) * Math.PI / 180)"
            :y2="50 + 25 * Math.sin((hourRotation - 90) * Math.PI / 180)"
            stroke="currentColor"
            class="text-primary"
            stroke-width="3"
            stroke-linecap="round"
          />
          
          <!-- Minute hand -->
          <line
            x1="50"
            y1="50"
            :x2="50 + 35 * Math.cos((minuteRotation - 90) * Math.PI / 180)"
            :y2="50 + 35 * Math.sin((minuteRotation - 90) * Math.PI / 180)"
            stroke="currentColor"
            class="text-secondary"
            stroke-width="2"
            stroke-linecap="round"
          />
          
          <!-- Second hand -->
          <line
            x1="50"
            y1="50"
            :x2="50 + 38 * Math.cos((secondRotation - 90) * Math.PI / 180)"
            :y2="50 + 38 * Math.sin((secondRotation - 90) * Math.PI / 180)"
            stroke="currentColor"
            class="text-accent"
            stroke-width="1"
            stroke-linecap="round"
          />
          
          <!-- Center dot -->
          <circle cx="50" cy="50" r="3" fill="currentColor" class="text-accent" />
        </svg>
      </div>
      
      <!-- Digital Time -->
      <div class="text-center">
        <div class="text-xl md:text-3xl font-mono font-medium text-primary">{{ formattedTime }}</div>
        <div class="text-xs md:text-sm text-muted">{{ formattedDate }}</div>
      </div>
    </div>
  </WidgetCard>
</template>

<script setup lang="ts">
const currentTime = ref(new Date())
const timezone = ref('Europe/London')

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date()
  }, 1000)
})

const formattedTime = computed(() => {
  return currentTime.value.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: timezone.value,
  })
})

const formattedDate = computed(() => {
  return currentTime.value.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: timezone.value,
  })
})

const hours = computed(() => {
  const time = currentTime.value.toLocaleTimeString('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone: timezone.value,
  })
  return parseInt(time)
})

const minutes = computed(() => {
  const time = currentTime.value.toLocaleTimeString('en-US', {
    minute: 'numeric',
    timeZone: timezone.value,
  })
  return parseInt(time)
})

const seconds = computed(() => {
  const time = currentTime.value.toLocaleTimeString('en-US', {
    second: 'numeric',
    timeZone: timezone.value,
  })
  return parseInt(time)
})

const hourRotation = computed(() => (hours.value % 12) * 30 + minutes.value * 0.5)
const minuteRotation = computed(() => minutes.value * 6)
const secondRotation = computed(() => seconds.value * 6)
</script>
