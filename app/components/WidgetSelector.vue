<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/50" @click="emit('close')" />
    <div class="relative bg-widget border border-primary rounded-lg shadow-xl w-full max-w-md mx-4">
      <div class="flex items-center justify-between px-4 py-3 border-b border-primary">
        <h3 class="text-sm font-medium text-primary">Add Widget</h3>
        <button
          class="p-1 rounded hover:bg-tertiary text-muted hover:text-primary transition-colors"
          @click="emit('close')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="p-4 space-y-2">
        <button
          v-for="w in availableWidgets"
          :key="w.type"
          class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-tertiary transition-colors text-left"
          @click.stop="addToColumn(w.type, w.title)"
        >
          <span class="text-lg">{{ w.icon }}</span>
          <div>
            <div class="text-sm font-medium text-primary">{{ w.title }}</div>
            <div class="text-xs text-muted">{{ w.description }}</div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { uid } from '~/utils/uid'
import type { WidgetConfig } from '~/types/config'

const store = useDashboardStore()
const emit = defineEmits<{
  close: []
}>()

const availableWidgets: Array<{ type: string; title: string; icon: string; description: string }> = [
  { type: 'calendar', title: 'Calendar', icon: '📅', description: 'Monthly calendar view' },
  { type: 'weather', title: 'Weather', icon: '🌤️', description: 'Weather forecast with hourly bars' },
  { type: 'clock', title: 'Clock', icon: '🕐', description: 'Analog and digital clock' },
  { type: 'rss', title: 'RSS Feed', icon: '📡', description: 'RSS/Atom feed reader' },
  { type: 'links', title: 'Quick Links', icon: '🔗', description: 'Configurable link grid' },
]

function addToColumn(type: string, title: string) {
  const page = store.currentPage
  if (!page) return
  const lastCol = page.columns.length - 1
  const widget: WidgetConfig = { id: uid(), type, title }
  store.addWidget(lastCol, widget)
  emit('close')
}
</script>
