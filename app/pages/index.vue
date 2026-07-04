<template>
  <div class="min-h-screen bg-primary">
    <div class="dashboard-wrapper">
      <div class="header-card">
        <NuxtLink to="/" class="header-logo">D</NuxtLink>

        <nav class="header-nav">
          <NuxtLink
            v-for="page in store.pages"
            :key="page.name"
            to="/"
            class="header-nav-item"
            :class="{ active: true }"
          >
            {{ page.name }}
          </NuxtLink>
        </nav>

        <div class="header-actions">
          <button
            class="header-btn"
            :class="{ 'header-btn-active': editor.isEditing }"
            @click="editor.toggleEdit()"
            title="Toggle edit mode"
          >
            <svg v-if="!editor.isEditing" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </button>

          <button
            class="header-btn header-btn-debug"
            :class="{ 'has-errors': editor.errors.length > 0, 'debug-on': editor.debugMode }"
            @click="editor.toggleDebug()"
            title="Toggle debug logs"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8V4m0 4a8 8 0 100 16 8 8 0 000-16z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 12v4" />
            </svg>
            <span v-if="editor.errors.length > 0" class="debug-badge">{{ editor.errors.length }}</span>
          </button>

          <button class="header-btn" title="Import YAML config" @click="emit('import')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
          </button>

          <button class="header-btn" title="Export YAML config" @click="emit('export')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 11l5-5 5 5M12 4v11" />
            </svg>
          </button>

          <button class="header-btn" @click="toggleTheme" :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'">
            <svg v-if="!isDark" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>
        </div>
      </div>

      <main class="dashboard-container">
        <!-- Edit mode -->
        <DashboardEditor v-if="editor.isEditing && store.currentPage" />

        <!-- View mode -->
        <template v-else-if="store.currentPage">
          <div
            class="dashboard-grid"
            :style="{ gridTemplateColumns: gridTemplate(store.currentPage.columns) }"
          >
            <div
              v-for="(column, ci) in store.currentPage.columns"
              :key="ci"
              class="dashboard-column"
            >
              <WidgetRenderer
                v-for="(widget, wi) in column.widgets"
                :key="wi"
                :widget="widget"
              />
            </div>
          </div>
        </template>

        <div v-else class="empty-state">
          <div class="empty-state-content">
            <div class="empty-state-text">No widgets configured</div>
            <button
              class="empty-state-link"
              @click="triggerImport"
            >
              Import a YAML config to get started
            </button>
          </div>
        </div>
      </main>
    </div>

    <div v-if="editor.debugMode" class="debug-panel">
      <div class="debug-panel-header">
        <span class="debug-panel-title">Widget Errors ({{ editor.errors.length }})</span>
        <div class="debug-panel-actions">
          <button class="debug-btn" @click="editor.clearErrors()">Clear</button>
          <button class="debug-btn" @click="editor.toggleDebug()">Close</button>
        </div>
      </div>
      <div v-if="editor.errors.length === 0" class="debug-empty">No errors logged</div>
      <div v-else class="debug-list">
        <div v-for="(err, i) in [...editor.errors].reverse()" :key="i" class="debug-item">
          <div class="debug-item-header">
            <span class="debug-item-widget">{{ err.widget }}</span>
            <div class="debug-item-actions">
              <button class="debug-copy-btn" title="Copy error" @click="copyError(err)">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <span class="debug-item-time">{{ formatTime(err.timestamp) }}</span>
            </div>
          </div>
          <div class="debug-item-message">{{ err.message }}</div>
          <div v-if="err.detail" class="debug-item-detail">{{ err.detail }}</div>
        </div>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept=".yaml,.yml"
      class="hidden"
      @change="handleFileUpload"
    />

    <ClientOnly>
      <Teleport to="body">
        <div
          v-if="toast"
          class="toast"
          :class="toast.type === 'success' ? 'toast-success' : 'toast-error'"
        >
          {{ toast.message }}
        </div>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { ColumnConfig } from '~/types/config'
import { SIZES } from '~/types/config'

const store = useDashboardStore()
const { toast, downloadYaml, handleFileUpload, saveToStorage } = useYamlConfig()
const editor = useEditorStore()
const { isDark, toggleTheme } = useTheme()

useHead({
  title: `${store.title} - Dashboard`,
})

const fileInput = ref<HTMLInputElement>()

watch(() => store.config, () => {
  saveToStorage()
}, { deep: true })

const emit = defineEmits<{
  import: []
  export: []
}>()

function triggerImport() {
  fileInput.value?.click()
}

function gridTemplate(columns: ColumnConfig[]) {
  return columns.map(c => SIZES[c.size]).join(' ')
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function copyError(err: { widget: string; message: string; detail?: string }) {
  const text = `[${err.widget}] ${err.message}${err.detail ? `\n${err.detail}` : ''}`
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.activeElement as HTMLElement
    btn?.classList.add('copied')
    setTimeout(() => btn?.classList.remove('copied'), 1000)
  })
}
</script>

<style scoped>
.dashboard-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.header-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background-color: var(--widget-bg);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
}

.header-logo {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.875rem;
  font-weight: 700;
  padding: 0.375rem 0.5rem;
  border-radius: 4px;
  background: var(--accent);
  color: var(--accent-text);
  text-decoration: none;
}

.header-nav {
  display: flex;
  gap: 0.25rem;
}

.header-nav-item {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  text-decoration: none;
  padding: 0.375rem 0.75rem;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}

.header-nav-item:hover {
  color: var(--text-primary);
  text-decoration: none;
}

.header-nav-item.active {
  color: var(--text-primary);
  border-bottom-color: var(--accent);
}

.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.header-btn {
  position: relative;
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

.header-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.header-btn-active {
  color: var(--accent);
  background: var(--bg-hover);
}

.header-btn-debug.debug-on {
  color: var(--accent);
}

.header-btn-debug.has-errors {
  color: #f59e0b;
}

.debug-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #dc2626;
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dashboard-container {
  display: flex;
  flex-direction: column;
}

.dashboard-grid {
  display: grid;
  gap: 1rem;
}

.dashboard-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5rem 0;
}

.empty-state-content {
  text-align: center;
}

.empty-state-text {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.875rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.empty-state-link {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.8125rem;
  color: var(--link-color);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
}

.empty-state-link:hover {
  color: var(--link-hover);
}

.toast {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.8125rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 50;
  transition: all 0.2s;
}

.toast-success {
  background-color: var(--accent);
  color: var(--accent-text);
}

.toast-error {
  background-color: var(--negative);
  color: #ffffff;
}

.debug-panel {
  position: fixed;
  bottom: 0;
  right: 0;
  width: 380px;
  max-height: 300px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 8px 0 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.2);
  z-index: 100;
  display: flex;
  flex-direction: column;
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
}

.debug-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border-primary);
}

.debug-panel-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-primary);
}

.debug-panel-actions {
  display: flex;
  gap: 0.25rem;
}

.debug-btn {
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  background: var(--bg-tertiary);
  color: var(--text-muted);
  border: none;
  cursor: pointer;
  transition: color 0.15s;
}

.debug-btn:hover {
  color: var(--text-primary);
}

.debug-empty {
  padding: 1.5rem 0.75rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.debug-list {
  overflow-y: auto;
  padding: 0.25rem;
  flex: 1;
}

.debug-item {
  padding: 0.375rem 0.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.debug-item:last-child {
  border-bottom: none;
}

.debug-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.125rem;
}

.debug-item-widget {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--negative);
  text-transform: uppercase;
}

.debug-item-time {
  font-size: 0.5625rem;
  color: var(--text-faint);
}

.debug-item-actions {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.debug-copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 3px;
  color: var(--text-faint);
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s, background-color 0.15s;
}

.debug-item:hover .debug-copy-btn {
  opacity: 1;
}

.debug-copy-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.debug-copy-btn.copied {
  color: var(--positive);
  opacity: 1;
}

.debug-item-message {
  font-size: 0.6875rem;
  color: var(--text-secondary);
}

.debug-item-detail {
  font-size: 0.625rem;
  color: var(--text-muted);
  margin-top: 0.125rem;
  word-break: break-all;
}

@media (max-width: 767px) {
  .dashboard-wrapper {
    padding: 0.5rem;
  }

  .header-card {
    padding: 0.375rem 0.5rem;
    gap: 0.5rem;
  }

  .header-nav-item {
    font-size: 0.75rem;
    padding: 0.375rem 0.5rem;
  }

  .debug-panel {
    width: 100%;
    max-height: 250px;
    border-radius: 0;
  }
}
</style>
