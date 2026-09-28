import { defineStore } from 'pinia'
import type { ReadonlyLayout } from 'grid-layout-plus'
import { dashboardStorageKey, defaultDashboard, parseBoard, upgradeDashboardDefaults } from '~/utils/boardConfig'
import type { BoardConfig, BoardWidget, DashboardId } from '~/utils/boardConfig'

export const useBoardStore = defineStore('board', () => {
  const activeDashboard = ref<DashboardId>('daily')
  const config = ref<BoardConfig>(defaultDashboard('daily'))
  const ready = ref(false)
  const message = ref('')
  const history = ref<BoardConfig[]>([])
  const widgets = computed(() => config.value.widgets)
  function persist() {
    try { localStorage.setItem(dashboardStorageKey(activeDashboard.value), JSON.stringify(config.value)); message.value = '' }
    catch { message.value = 'Stockage indisponible : les modifications ne sont pas enregistrées' }
  }
  function init(dashboard: DashboardId = 'daily') {
    if (ready.value && activeDashboard.value === dashboard) return
    activeDashboard.value = dashboard
    config.value = defaultDashboard(dashboard)
    history.value = []
    message.value = ''
    try {
      const raw = localStorage.getItem(dashboardStorageKey(dashboard))
      if (raw) {
        const parsed = parseBoard(JSON.parse(raw))
        if (!parsed) throw new Error('Invalid configuration')
        config.value = upgradeDashboardDefaults(dashboard, parsed)
        if (JSON.stringify(config.value) !== raw) persist()
        message.value = ''
      } else persist()
    } catch { message.value = 'Configuration illisible : un tableau initial a été chargé' }
    ready.value = true
  }
  function commit(next: BoardConfig) {
    const parsed = parseBoard(next)
    if (!parsed) { message.value = 'Modification refusée : configuration invalide'; return false }
    if (JSON.stringify(parsed) === JSON.stringify(config.value)) return true
    history.value.push(JSON.parse(JSON.stringify(config.value)))
    if (history.value.length > 30) history.value.shift()
    config.value = parsed
    persist()
    return true
  }
  function setLayout(layout: ReadonlyLayout) {
    if (layout.length !== widgets.value.length || new Set(layout.map(p => p.i)).size !== widgets.value.length) return
    const next = widgets.value.map(w => {
      const p = layout.find(p => p.i === w.id)
      return p ? { ...w, x: p.x, y: p.y, w: p.w, h: p.h } : w
    })
    commit({ version: 1, widgets: next })
  }
  function saveWidget(widget: BoardWidget) {
    const exists = widgets.value.some(w => w.id === widget.id)
    const next = exists ? widgets.value.map(w => w.id === widget.id ? widget : w) : [...widgets.value, { ...widget, x: 0, y: Math.max(0, ...widgets.value.map(w => w.y + w.h)) }]
    return commit({ version: 1, widgets: next })
  }
  function removeWidget(id: string) { commit({ version: 1, widgets: widgets.value.filter(w => w.id !== id) }) }
  function undo() { const previous = history.value.pop(); if (previous) { config.value = previous; persist() } }
  return { activeDashboard, config, ready, message, history, widgets, init, setLayout, saveWidget, removeWidget, undo }
})
