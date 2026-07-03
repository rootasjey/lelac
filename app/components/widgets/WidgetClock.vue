<template>
  <WidgetCard title="Clock">
    <div class="clock">
      <div class="clock-digital">
        <div class="clock-time">{{ formattedTime }}</div>
        <div class="clock-date">{{ formattedDate }}</div>
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
</script>

<style scoped>
.clock {
  display: flex;
  justify-content: center;
}

.clock-digital {
  text-align: center;
}

.clock-time {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 1.75rem;
  font-weight: 500;
  color: var(--text-primary);
  letter-spacing: 0.05em;
}

.clock-date {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}
</style>
