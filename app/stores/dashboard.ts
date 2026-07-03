import { defineStore } from 'pinia'
import type { DashboardConfig, PageConfig, WidgetConfig, ColumnConfig } from '~/types/config'
import { defaultConfig } from '~/utils/defaultConfig'

export const useDashboardStore = defineStore('dashboard', () => {
  const config = ref<DashboardConfig>({ ...defaultConfig })
  const activePage = ref(0)

  const pages = computed(() => config.value.pages)
  const currentPage = computed(() => pages.value[activePage.value] ?? null)
  const title = computed(() => config.value.title ?? 'Distill')

  function setConfig(newConfig: DashboardConfig) {
    config.value = { ...newConfig }
    activePage.value = 0
  }

  function addPage(page: PageConfig) {
    config.value.pages.push(page)
  }

  function removePage(index: number) {
    if (config.value.pages.length > 1) {
      config.value.pages.splice(index, 1)
      if (activePage.value >= config.value.pages.length) {
        activePage.value = config.value.pages.length - 1
      }
    }
  }

  // Widget manipulation
  function addWidget(columnIndex: number, widget: WidgetConfig) {
    const page = currentPage.value
    if (!page) return
    if (!page.columns[columnIndex]) {
      page.columns[columnIndex] = { size: 'medium', widgets: [] }
    }
    page.columns[columnIndex].widgets.push(widget)
  }

  function removeWidget(columnIndex: number, widgetIndex: number) {
    const page = currentPage.value
    if (!page) return
    page.columns[columnIndex]?.widgets.splice(widgetIndex, 1)
  }

  function moveWidget(fromCol: number, fromIndex: number, toCol: number, toIndex: number) {
    const page = currentPage.value
    if (!page) return
    const widget = page.columns[fromCol]?.widgets[fromIndex]
    if (!widget) return
    page.columns[fromCol].widgets.splice(fromIndex, 1)
    if (!page.columns[toCol]) {
      page.columns[toCol] = { size: 'medium', widgets: [] }
    }
    page.columns[toCol].widgets.splice(toIndex, 0, widget)
  }

  function reorderWidget(columnIndex: number, fromIndex: number, toIndex: number) {
    const page = currentPage.value
    if (!page) return
    const col = page.columns[columnIndex]
    if (!col) return
    const [widget] = col.widgets.splice(fromIndex, 1)
    col.widgets.splice(toIndex, 0, widget)
  }

  function setColumnSize(columnIndex: number, size: 'small' | 'medium' | 'large') {
    const page = currentPage.value
    if (!page) return
    const col = page.columns[columnIndex]
    if (col) col.size = size
  }

  function addColumn(index?: number) {
    const page = currentPage.value
    if (!page) return
    const col: ColumnConfig = { size: 'medium', widgets: [] }
    if (index !== undefined) {
      page.columns.splice(index, 0, col)
    } else {
      page.columns.push(col)
    }
  }

  function removeColumn(index: number) {
    const page = currentPage.value
    if (!page || page.columns.length <= 1) return
    page.columns.splice(index, 1)
  }

  return {
    config,
    activePage,
    pages,
    currentPage,
    title,
    setConfig,
    addPage,
    removePage,
    addWidget,
    removeWidget,
    moveWidget,
    reorderWidget,
    setColumnSize,
    addColumn,
    removeColumn,
  }
})
