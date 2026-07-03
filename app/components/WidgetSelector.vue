<template>
  <div class="modal-overlay">
    <div class="modal-backdrop" @click="emit('close')" />
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Add Widget</h3>
        <button
          class="modal-close"
          @click="emit('close')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <button
          v-for="w in availableWidgets"
          :key="w.type"
          class="widget-option"
          @click.stop="addToColumn(w.type, w.title)"
        >
          <span class="widget-option-icon">{{ w.icon }}</span>
          <div class="widget-option-info">
            <div class="widget-option-title">{{ w.title }}</div>
            <div class="widget-option-desc">{{ w.description }}</div>
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
  { type: 'calendar', title: 'Calendar', icon: '📅', description: 'Monthly calendar with week numbers' },
  { type: 'weather', title: 'Weather', icon: '🌤️', description: 'Weather forecast with hourly bars' },
  { type: 'clock', title: 'Clock', icon: '🕐', description: 'Digital clock with timezone' },
  { type: 'rss', title: 'RSS Feed', icon: '📡', description: 'RSS/Atom feed reader' },
  { type: 'links', title: 'Quick Links', icon: '🔗', description: 'Configurable link grid' },
  { type: 'hn', title: 'Hacker News', icon: '🟠', description: 'Hacker News front page stories' },
  { type: 'reddit', title: 'Reddit', icon: '🔴', description: 'Posts from any subreddit' },
  { type: 'twitch', title: 'Twitch Channels', icon: '🟣', description: 'Followed Twitch channels' },
  { type: 'videos', title: 'Videos', icon: '🎬', description: 'Recent YouTube videos' },
  { type: 'markets', title: 'Markets', icon: '📈', description: 'Stock prices and sparklines' },
  { type: 'releases', title: 'Releases', icon: '📦', description: 'GitHub repository releases' },
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

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-backdrop {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.modal {
  position: relative;
  background-color: var(--widget-bg);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 28rem;
  margin: 0 1rem;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-primary);
}

.modal-title {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s;
}

.modal-close:hover {
  color: var(--text-primary);
  background-color: var(--bg-hover);
}

.modal-body {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.widget-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background-color 0.15s;
}

.widget-option:hover {
  background-color: var(--bg-hover);
}

.widget-option-icon {
  font-size: 1.125rem;
  width: 1.5rem;
  text-align: center;
}

.widget-option-info {
  min-width: 0;
}

.widget-option-title {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-primary);
}

.widget-option-desc {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.6875rem;
  color: var(--text-muted);
}
</style>
