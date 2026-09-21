<template>
  <div v-if="store.currentPage" class="editor">
    <!-- Editor toolbar -->
    <div class="editor-toolbar">
      <span class="editor-label">Editor</span>
      <div class="editor-actions">
        <button
          class="editor-btn editor-btn-primary"
          @click="showAddWidget = true"
        >
          + Widget
        </button>
        <button
          class="editor-btn editor-btn-secondary"
          @click="editor.exitEdit()"
        >
          Done
        </button>
      </div>
    </div>

    <!-- Grid -->
    <div
      class="editor-grid"
      :style="{ gridTemplateColumns: gridTemplate(store.currentPage.columns) }"
    >
      <div
        v-for="(column, ci) in store.currentPage.columns"
        :key="ci"
        class="editor-column"
      >
        <!-- Column header -->
        <div class="editor-column-header">
          <span class="editor-column-size">{{ column.size }}</span>
          <NTooltip content="Redimensionner la colonne">
          <button
            class="editor-icon-btn"
            aria-label="Redimensionner la colonne"
            @click="cycleSize(ci)"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
          </NTooltip>
          <NTooltip v-if="store.currentPage.columns.length > 1" content="Supprimer la colonne">
          <button
            v-if="store.currentPage.columns.length > 1"
            class="editor-icon-btn editor-icon-btn-danger"
            aria-label="Supprimer la colonne"
            @click="store.removeColumn(ci)"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          </NTooltip>
        </div>

        <!-- Draggable widget list -->
        <VueDraggable
          v-model="column.widgets"
          group="widgets"
          class="editor-drag-area"
          @change="onDragChange"
        >
          <div
            v-for="(widget, wi) in column.widgets"
            :key="widgetKey(widget)"
            class="editor-widget"
          >
            <!-- Drag handle and actions -->
            <div class="editor-widget-header">
              <div class="editor-widget-handle">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z" />
                </svg>
                <span class="editor-widget-type">{{ widget.type }}</span>
              </div>
              <div class="editor-widget-actions">
                <NTooltip content="Configurer le widget">
                <button
                  class="editor-icon-btn editor-widget-settings"
                  aria-label="Configurer le widget"
                  @click="openSettings(ci, wi)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                </NTooltip>
                <NTooltip content="Supprimer le widget">
                <button
                  class="editor-icon-btn editor-icon-btn-danger editor-widget-remove"
                  aria-label="Supprimer le widget"
                  @click="removeWidget(ci, wi)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                </NTooltip>
              </div>
            </div>
            <!-- Widget preview -->
            <div class="editor-widget-preview">
              <WidgetRenderer :widget="widget" />
            </div>
          </div>
        </VueDraggable>

        <!-- Add widget button at bottom of column -->
        <button
          class="editor-add-btn"
          @click="store.addWidget(ci, { id: uid(), type: 'clock', title: 'Clock' })"
        >
          + Add Widget
        </button>
      </div>

      <!-- Add column button -->
      <div class="editor-add-column">
        <button
          class="editor-add-btn"
          @click="store.addColumn()"
        >
          + Column
        </button>
      </div>
    </div>

    <!-- Add widget modal -->
    <WidgetSelector v-if="showAddWidget" @close="showAddWidget = false" />

    <!-- Widget settings modal -->
    <WidgetSettings
      v-if="settingsTarget"
      :widget="settingsTarget.widget"
      :column-index="settingsTarget.ci"
      :widget-index="settingsTarget.wi"
      @close="settingsTarget = null"
    />
  </div>
</template>

<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { ColumnConfig, WidgetConfig } from '~/types/config'
import { SIZES } from '~/types/config'
import { uid } from '~/utils/uid'

const store = useDashboardStore()
const editor = useEditorStore()

const showAddWidget = ref(false)
const settingsTarget = ref<{ widget: WidgetConfig; ci: number; wi: number } | null>(null)

function openSettings(ci: number, wi: number) {
  const widget = store.currentPage?.columns[ci]?.widgets[wi]
  if (widget) {
    settingsTarget.value = { widget, ci, wi }
  }
}

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
  const nextSize = sizes[(currentIndex + 1) % sizes.length] as 'small' | 'medium' | 'large'
  store.setColumnSize(colIndex, nextSize)
}
</script>

<style scoped>
.editor {
  margin-bottom: 1rem;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.625rem 0.875rem;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
}

.editor-label {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
}

.editor-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.editor-btn {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.editor-btn-primary {
  background-color: var(--accent);
  color: var(--accent-text);
}

.editor-btn-primary:hover {
  opacity: 0.9;
}

.editor-btn-secondary {
  background-color: transparent;
  color: var(--text-muted);
}

.editor-btn-secondary:hover {
  color: var(--text-primary);
  background-color: var(--bg-hover);
}

.editor-grid {
  display: grid;
  gap: 1rem;
}

.editor-column {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.editor-column-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.25rem;
}

.editor-column-size {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  text-transform: uppercase;
}

.editor-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s;
}

.editor-icon-btn:hover {
  color: var(--text-primary);
  background-color: var(--bg-hover);
}

.editor-icon-btn-danger:hover {
  color: var(--negative);
  background-color: rgba(248, 81, 73, 0.1);
}

.editor-drag-area {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 60px;
  padding: 0.25rem;
  border-radius: 6px;
  border: 2px dashed transparent;
  transition: border-color 0.15s;
}

.editor-drag-area:hover {
  border-color: rgba(88, 166, 255, 0.3);
}

.editor-widget {
  background-color: var(--widget-bg);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  overflow: hidden;
}

.editor-widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0.625rem;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  opacity: 0.5;
}

.editor-widget-handle {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  cursor: grab;
  color: var(--text-muted);
}

.editor-widget-handle:active {
  cursor: grabbing;
}

.editor-widget-type {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.editor-widget-actions {
  display: flex;
  gap: 0.125rem;
}

.editor-widget-settings,
.editor-widget-remove {
  opacity: 0;
  transition: opacity 0.15s;
}

.editor-widget:hover .editor-widget-settings,
.editor-widget:hover .editor-widget-remove {
  opacity: 1;
}

.editor-widget-preview {
  opacity: 0.6;
  pointer-events: none;
}

.editor-add-btn {
  width: 100%;
  padding: 0.5rem;
  border-radius: 6px;
  border: 2px dashed var(--border-primary);
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.75rem;
  color: var(--text-muted);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
}

.editor-add-btn:hover {
  color: var(--text-primary);
  border-color: rgba(88, 166, 255, 0.5);
}

.editor-add-column {
  display: flex;
  align-items: flex-start;
}
</style>
