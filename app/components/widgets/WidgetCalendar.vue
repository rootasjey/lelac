<template>
  <WidgetCard title="Calendar">
    <div class="calendar">
      <div class="calendar-header">
        <div class="calendar-title">
          {{ monthName }} {{ year }}
        </div>
        <div class="calendar-nav">
          <button class="calendar-nav-btn" @click="prevMonth">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span class="calendar-week">Week {{ weekNumber }}</span>
          <button class="calendar-nav-btn" @click="nextMonth">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div class="calendar-grid">
        <div
          v-for="day in daysOfWeek"
          :key="day"
          class="calendar-day-header"
        >
          {{ day }}
        </div>

        <div
          v-for="(day, index) in calendarDays"
          :key="index"
          class="calendar-day"
          :class="{
            'calendar-day-other': !day.isCurrentMonth,
            'calendar-day-today': day.isToday,
          }"
        >
          <span class="calendar-day-number">{{ day.date }}</span>
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

<style scoped>
.calendar {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.calendar-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.calendar-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.calendar-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s;
}

.calendar-nav-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.calendar-week {
  font-size: 0.6875rem;
  color: var(--text-muted);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0;
}

.calendar-day-header {
  font-size: 0.625rem;
  font-weight: 500;
  color: var(--text-muted);
  text-align: center;
  padding: 0.25rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.calendar-day {
  text-align: center;
  padding: 0.125rem 0;
}

.calendar-day-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  border-radius: 50%;
}

.calendar-day-other .calendar-day-number {
  color: var(--text-faint);
}

.calendar-day-today .calendar-day-number {
  background-color: var(--calendar-today-bg);
  color: var(--calendar-today-text);
  font-weight: 600;
}
</style>
