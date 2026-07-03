<template>
  <div class="min-h-screen bg-primary">
    <AppHeader @import="triggerImport" @export="downloadYaml()" />

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

    <input
      ref="fileInput"
      type="file"
      accept=".yaml,.yml"
      class="hidden"
      @change="handleFileUpload"
    />

    <!-- Toast -->
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

useHead({
  title: `${store.title} - Dashboard`,
})

const fileInput = ref<HTMLInputElement>()

watch(() => store.config, () => {
  saveToStorage()
}, { deep: true })

function triggerImport() {
  fileInput.value?.click()
}

function gridTemplate(columns: ColumnConfig[]) {
  return columns.map(c => SIZES[c.size]).join(' ')
}
</script>

<style scoped>
.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
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

@media (max-width: 767px) {
  .dashboard-container {
    padding: 0.75rem;
  }
}
</style>
