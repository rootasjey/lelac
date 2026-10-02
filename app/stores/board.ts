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
  const remoteEnabled = ref(false)
  const syncedUserId = ref('')
  const widgets = computed(() => config.value.widgets)
  let remoteSaveTimer: ReturnType<typeof setTimeout> | undefined

  function queueRemoteSave() {
    if (!remoteEnabled.value || !syncedUserId.value || typeof window === 'undefined') return
    if (remoteSaveTimer) clearTimeout(remoteSaveTimer)
    remoteSaveTimer = setTimeout(async () => {
      try {
        await $fetch(`/api/boards/${activeDashboard.value}`, { method: 'PUT', body: config.value })
        if (message.value.startsWith('Synchronisation')) message.value = ''
      } catch {
        message.value = 'Synchronisation impossible : vos modifications restent enregistrées dans ce navigateur'
      }
    }, 450)
  }

  async function queueRemoteSaveAll(configurations = readAllDashboards()) {
    if (!remoteEnabled.value || !syncedUserId.value) return
    try {
      await $fetch('/api/boards', { method: 'PUT', body: { dashboards: configurations } })
      if (message.value.startsWith('Synchronisation')) message.value = ''
    } catch {
      message.value = 'Synchronisation impossible : vos modifications restent enregistrées dans ce navigateur'
    }
  }

  function persist() {
    try { localStorage.setItem(dashboardStorageKey(activeDashboard.value), JSON.stringify(config.value)); if (!message.value.startsWith('Synchronisation')) message.value = '' }
    catch { message.value = 'Stockage indisponible : les modifications ne sont pas enregistrées' }
    queueRemoteSave()
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
    commit({ ...config.value, widgets: next })
  }
  function saveWidget(widget: BoardWidget) {
    const exists = widgets.value.some(w => w.id === widget.id)
    const next = exists ? widgets.value.map(w => w.id === widget.id ? widget : w) : [...widgets.value, { ...widget, x: 0, y: Math.max(0, ...widgets.value.map(w => w.y + w.h)) }]
    return commit({ ...config.value, widgets: next })
  }
  function removeWidget(id: string) { commit({ ...config.value, widgets: widgets.value.filter(w => w.id !== id) }) }
  function undo() { const previous = history.value.pop(); if (previous) { config.value = previous; persist() } }
  function resetDispositions() {
    const dashboards: DashboardId[] = ['daily', 'tech', 'cinema']
    try {
      for (const dashboard of dashboards) {
        const defaults = defaultDashboard(dashboard)
        localStorage.setItem(dashboardStorageKey(dashboard), JSON.stringify(defaults))
        if (dashboard === activeDashboard.value) config.value = defaults
      }
      history.value = []
      message.value = ''
      ready.value = true
      void queueRemoteSaveAll()
      return true
    } catch {
      message.value = 'Stockage indisponible : les tableaux n’ont pas été réinitialisés'
      return false
    }
  }
  function readAllDashboards(): Record<DashboardId, BoardConfig> {
    const dashboards: DashboardId[] = ['daily', 'tech', 'cinema']
    const result = {} as Record<DashboardId, BoardConfig>
    for (const dashboard of dashboards) {
      if (ready.value && activeDashboard.value === dashboard) {
        result[dashboard] = config.value
        continue
      }
      const raw = localStorage.getItem(dashboardStorageKey(dashboard))
      if (!raw) {
        result[dashboard] = defaultDashboard(dashboard)
        continue
      }
      const parsed = parseBoard(JSON.parse(raw))
      if (!parsed) throw new Error(`Configuration illisible pour le tableau ${dashboard}`)
      result[dashboard] = upgradeDashboardDefaults(dashboard, parsed)
    }
    return result
  }
  function replaceAllDashboards(configurations: Record<DashboardId, BoardConfig>) {
    const dashboards: DashboardId[] = ['daily', 'tech', 'cinema']
    const parsed = {} as Record<DashboardId, BoardConfig>
    for (const dashboard of dashboards) {
      const board = parseBoard(configurations[dashboard])
      if (!board) {
        message.value = `Configuration invalide pour le tableau ${dashboard}`
        return false
      }
      parsed[dashboard] = upgradeDashboardDefaults(dashboard, board)
    }

    const previous = new Map<string, string | null>()
    try {
      for (const dashboard of dashboards) {
        const key = dashboardStorageKey(dashboard)
        previous.set(key, localStorage.getItem(key))
      }
      for (const dashboard of dashboards) {
        localStorage.setItem(dashboardStorageKey(dashboard), JSON.stringify(parsed[dashboard]))
      }
    } catch {
      for (const [key, value] of previous) {
        try {
          if (value === null) localStorage.removeItem(key)
          else localStorage.setItem(key, value)
        } catch { /* Best-effort rollback if browser storage becomes unavailable. */ }
      }
      message.value = 'Stockage indisponible : la configuration n’a pas été importée'
      return false
    }

    if (ready.value) config.value = parsed[activeDashboard.value]
    history.value = []
    message.value = ''
    void queueRemoteSaveAll(parsed)
    return true
  }

  async function syncWithAccount() {
    const session = useUserSession()
    const userId = session.user.value?.id
    if (!userId) {
      remoteEnabled.value = false
      syncedUserId.value = ''
      return
    }
    if (syncedUserId.value === userId && remoteEnabled.value) return

    remoteEnabled.value = false
    syncedUserId.value = ''
    try {
      const result = await $fetch<{ dashboards: Record<DashboardId, BoardConfig>; hasStoredDashboards: boolean }>('/api/boards')
      if (result.hasStoredDashboards) {
        if (!replaceAllDashboards(result.dashboards)) throw new Error('Impossible de charger les tableaux du compte.')
      } else {
        await $fetch('/api/boards', { method: 'PUT', body: { dashboards: readAllDashboards() } })
      }
      remoteEnabled.value = true
      syncedUserId.value = userId
      message.value = ''
    } catch (error) {
      remoteEnabled.value = false
      syncedUserId.value = ''
      message.value = error instanceof Error ? `Synchronisation impossible : ${error.message}` : 'Synchronisation impossible : les modifications restent dans ce navigateur'
    }
  }

  function disableRemoteSync() {
    if (remoteSaveTimer) clearTimeout(remoteSaveTimer)
    remoteEnabled.value = false
    syncedUserId.value = ''
  }

  return { activeDashboard, config, ready, message, history, widgets, init, setLayout, saveWidget, removeWidget, undo, resetDispositions, readAllDashboards, replaceAllDashboards, syncWithAccount, disableRemoteSync }
})
