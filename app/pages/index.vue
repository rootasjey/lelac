<script setup lang="ts">
import type { ColumnConfig } from '~/types/config'
import { SIZES } from '~/types/config'

const store = useDashboardStore()
const yaml = useYamlConfig()

useHead({
  title: `${store.title} - Dashboard`,
})

const fileInput = ref<HTMLInputElement>()

function triggerImport() {
  fileInput.value?.click()
}

function gridTemplate(columns: ColumnConfig[]) {
  return columns.map(c => SIZES[c.size]).join(' ')
}
</script>

<template>
  <div class="min-h-screen bg-primary">
    <AppHeader @import="triggerImport" @export="yaml.downloadYaml()" />

    <main class="mx-auto max-w-7xl px-3 md:px-4 py-3 md:py-4">
      <template v-if="store.currentPage">
        <div
          class="grid gap-3 md:gap-4 dashboard-grid"
          :style="{ gridTemplateColumns: gridTemplate(store.currentPage.columns) }"
        >
          <div
            v-for="(column, ci) in store.currentPage.columns"
            :key="ci"
            class="space-y-4"
          >
            <WidgetRenderer
              v-for="(widget, wi) in column.widgets"
              :key="wi"
              :widget="widget"
            />
          </div>
        </div>
      </template>

      <div v-else class="flex items-center justify-center py-20">
        <div class="text-center">
          <div class="text-lg text-muted mb-2">No widgets configured</div>
          <button
            class="text-sm text-link hover:text-link-hover"
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
      @change="yaml.handleFileUpload"
    />

    <!-- Toast -->
    <Teleport to="body">
      <div
        v-if="yaml.toast"
        class="fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg text-sm z-50 transition-all"
        :class="yaml.toast.type === 'success' ? 'bg-accent text-accent-text' : 'bg-red-500 text-white'"
      >
        {{ yaml.toast.message }}
      </div>
    </Teleport>
  </div>
</template>
