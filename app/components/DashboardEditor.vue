<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { ColumnConfig, WidgetConfig } from '~/types/config'
import { SIZES } from '~/types/config'
import { uid } from '~/utils/uid'

const store = useDashboardStore()
const editor = useEditorStore()

const showAddWidget = ref(false)

function gridTemplate(columns: ColumnConfig[]) {
  return columns.map(c => SIZES[c.size]).join(' ')
}

function widgetKey(widget: WidgetConfig) {
  return widget.id ?? `${widget.type}-${widget.title}`
}

function onDragChange() {
  // The v-model:list binding handles the array mutations automatically
}

function removeWidget(colIndex: number, wIndex: number) {
  store.removeWidget(colIndex, wIndex)
}

function cycleSize(colIndex: number) {
  const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large']
  const col = store.currentPage?.columns[colIndex]
  if (!col) return
  const currentIndex = sizes.indexOf(col.size)
  const nextSize = sizes[(currentIndex + 1) % sizes.length]
  store.setColumnSize(colIndex, nextSize)
}
</script>

<template>
  <div v-if="store.currentPage">
    <!-- Editor toolbar -->
    <div class="flex items-center gap-2 mb-4 px-3 py-2 bg-secondary border border-primary rounded">
      <span class="text-xs text-muted font-medium">Editor</span>
      <div class="ml-auto flex items-center gap-2">
        <button
          class="px-3 py-1.5 rounded text-xs font-medium bg-accent text-accent-text hover:opacity-90 transition-opacity"
          @click="showAddWidget = true"
        >
          + Widget
        </button>
        <button
          class="px-3 py-1.5 rounded text-xs font-medium text-muted hover:text-primary hover:bg-tertiary transition-colors"
          @click="editor.exitEdit()"
        >
          Done
        </button>
      </div>
    </div>

    <!-- Grid -->
    <div
      class="grid gap-4"
      :style="{ gridTemplateColumns: gridTemplate(store.currentPage.columns) }"
    >
      <div
        v-for="(column, ci) in store.currentPage.columns"
        :key="ci"
        class="space-y-2"
      >
        <!-- Column header -->
        <div class="flex items-center gap-2 px-2">
          <span class="text-[10px] text-muted uppercase tracking-wider font-medium">{{ column.size }}</span>
          <button
            class="ml-auto p-1 rounded hover:bg-tertiary text-muted hover:text-primary transition-colors"
            :title="'Resize column'"
            @click="cycleSize(ci)"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
          <button
            v-if="store.currentPage.columns.length > 1"
            class="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-muted hover:text-red-500 transition-colors"
            :title="'Remove column'"
            @click="store.removeColumn(ci)"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        <!-- Draggable widget list -->
        <VueDraggable
          v-model="column.widgets"
          group="widgets"
          class="space-y-2 min-h-[60px] rounded border-2 border-dashed border-transparent hover:border-accent/30 transition-colors p-1"
          @change="onDragChange"
        >
          <div
            v-for="(widget, wi) in column.widgets"
            :key="widgetKey(widget)"
            class="group relative bg-widget border border-primary rounded overflow-hidden"
          >
            <!-- Drag handle and actions -->
            <div class="flex items-center justify-between px-3 py-1.5 bg-secondary/50 border-b border-primary/50">
              <div class="flex items-center gap-2 cursor-grab active:cursor-grabbing">
                <svg class="w-3.5 h-3.5 text-muted" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z" />
                </svg>
                <span class="text-xs text-muted font-mono uppercase">{{ widget.type }}</span>
              </div>
              <button
                class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-muted hover:text-red-500 transition-all"
                :title="'Remove widget'"
                @click="removeWidget(ci, wi)"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <!-- Widget preview -->
            <div class="opacity-60 pointer-events-none">
              <WidgetRenderer :widget="widget" />
            </div>
          </div>
        </VueDraggable>

        <!-- Add widget button at bottom of column -->
        <button
          class="w-full py-2 rounded border-2 border-dashed border-primary/50 text-xs text-muted hover:text-primary hover:border-accent/50 transition-colors"
          @click="store.addWidget(ci, { id: uid(), type: 'clock', title: 'Clock' })"
        >
          + Add Widget
        </button>
      </div>

      <!-- Add column button -->
      <div class="flex items-center">
        <button
          class="w-full py-2 rounded border-2 border-dashed border-primary/50 text-xs text-muted hover:text-primary hover:border-accent/50 transition-colors"
          @click="store.addColumn()"
        >
          + Column
        </button>
      </div>
    </div>

    <!-- Add widget modal -->
    <WidgetSelector v-if="showAddWidget" @close="showAddWidget = false" />
  </div>
</template>
