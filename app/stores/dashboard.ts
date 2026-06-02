import { defineStore } from 'pinia'
import type { DashboardConfig, PageConfig } from '~/types/config'
import { defaultConfig } from '~/utils/defaultConfig'

export const useDashboardStore = defineStore('dashboard', () => {
  const config = ref<DashboardConfig>({ ...defaultConfig })
  const activePage = ref(0)

  const pages = computed(() => config.value.pages)
  const currentPage = computed(() => pages.value[activePage.value] ?? null)
  const title = computed(() => config.value.title ?? 'Vitrine')

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

  return {
    config,
    activePage,
    pages,
    currentPage,
    title,
    setConfig,
    addPage,
    removePage,
  }
})
