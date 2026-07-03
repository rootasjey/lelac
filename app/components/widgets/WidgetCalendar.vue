<template>
  <WidgetCard title="Calendar">
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h4 class="font-medium text-primary text-sm">{{ monthName }}</h4>
        <span class="text-xs text-muted">Week {{ weekNumber }} · {{ year }}</span>
      </div>

      <div class="grid grid-cols-7 text-center">
        <div
          v-for="day in daysOfWeek"
          :key="day"
          class="text-[10px] text-muted font-medium py-1"
        >
          {{ day }}
        </div>

        <div
          v-for="(day, index) in calendarDays"
          :key="index"
          class="text-xs py-1"
          :class="{
            'text-muted': !day.isCurrentMonth,
            'text-primary': day.isCurrentMonth && !day.isToday,
          }"
        >
          <span
            v-if="day.isToday"
            class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent text-accent-text text-xs font-medium"
          >
            {{ day.date }}
          </span>
          <span v-else class="inline-flex items-center justify-center w-6 h-6">
            {{ day.date }}
          </span>
        </div>
      </div>
    </div>
  </WidgetCard>
</template>

<script setup lang="ts">
const currentDate = ref(new Date())

const monthName = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', {
    month: 'long',
  })
})

const weekNumber = computed(() => {
  const d = new Date(currentDate.value)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
})

const year = computed(() => currentDate.value.getFullYear())

const daysOfWeek = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const calendarDays = computed(() => {
  const y = currentDate.value.getFullYear()
  const m = currentDate.value.getMonth()

  const firstDay = new Date(y, m, 1)
  const lastDay = new Date(y, m + 1, 0)

  const days: Array<{ date: number; isCurrentMonth: boolean; isToday: boolean }> = []

  const firstDayOfWeek = (firstDay.getDay() + 6) % 7
  const prevMonthLastDay = new Date(y, m, 0).getDate()
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: prevMonthLastDay - i,
      isCurrentMonth: false,
      isToday: false,
    })
  }

  const today = new Date()
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({
      date: i,
      isCurrentMonth: true,
      isToday: today.getDate() === i && today.getMonth() === m && today.getFullYear() === y,
    })
  }

  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({
      date: i,
      isCurrentMonth: false,
      isToday: false,
    })
  }

  return days
})

function prevMonth() {
  const newDate = new Date(currentDate.value)
  newDate.setMonth(newDate.getMonth() - 1)
  currentDate.value = newDate
}

function nextMonth() {
  const newDate = new Date(currentDate.value)
  newDate.setMonth(newDate.getMonth() + 1)
  currentDate.value = newDate
}
</script>
