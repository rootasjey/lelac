import { defineStore } from 'pinia'
import type { ReadonlyLayout } from 'grid-layout-plus'
import {
  dashboardIds,
  dashboardListStorageKey,
  dashboardStorageOwnerKey,
  dashboardStorageKey,
  canPersistDashboardSnapshot,
  defaultDashboard,
  defaultDashboardDefinitions,
  parseBoard,
  parseDashboardDefinitions,
  shouldDiscardForeignDashboardCache,
  upgradeDashboardDefaults,
} from '~/utils/boardConfig'
import type { BoardConfig, BoardWidget, DashboardBackup, DashboardDefinition, DashboardId } from '~/utils/boardConfig'

export const useBoardStore = defineStore('board', () => {
  const activeDashboard = ref<DashboardId>('daily')
  const dashboards = ref<DashboardDefinition[]>(defaultDashboardDefinitions.map(item => ({ ...item })))
  const accountHandle = ref('')
  const config = ref<BoardConfig>(defaultDashboard('daily'))
  const ready = ref(false)
  const message = ref('')
  const history = ref<BoardConfig[]>([])
  const remoteEnabled = ref(false)
  const syncedUserId = ref('')
  const widgets = computed(() => config.value.widgets)
  let remoteSaveTimer: ReturnType<typeof setTimeout> | undefined
  let dashboardListLoaded = false
  let remoteWriteQueue = Promise.resolve()

  function orderedDashboards() {
    return [...dashboards.value].sort((a, b) => a.order - b.order)
  }

  function loadDashboardList() {
    if (dashboardListLoaded || typeof localStorage === 'undefined') return
    dashboardListLoaded = true
    try {
      const raw = localStorage.getItem(dashboardListStorageKey)
      if (!raw) return
      const parsed = parseDashboardDefinitions(JSON.parse(raw))
      if (parsed) dashboards.value = parsed
      else message.value = 'Liste de tableaux invalide : les tableaux de départ ont été chargés'
    } catch {
      message.value = 'Liste de tableaux illisible : les tableaux de départ ont été chargés'
    }
  }

  function writeDashboardList() {
    try {
      localStorage.setItem(dashboardListStorageKey, JSON.stringify(orderedDashboards()))
      dashboardListLoaded = true
      return true
    } catch {
      message.value = 'Stockage indisponible : les tableaux ne sont pas enregistrés'
      return false
    }
  }

  function queueRemoteSave() {
    if (!remoteEnabled.value || !syncedUserId.value || typeof window === 'undefined') return
    if (remoteSaveTimer) clearTimeout(remoteSaveTimer)
    const dashboardId = activeDashboard.value
    const dashboardConfig = JSON.parse(JSON.stringify(config.value)) as BoardConfig
    const snapshotUserId = syncedUserId.value
    remoteSaveTimer = setTimeout(async () => {
      remoteWriteQueue = remoteWriteQueue.then(async () => {
        if (!canPersistDashboardSnapshot(snapshotUserId, syncedUserId.value, remoteEnabled.value)) return
        await $fetch(`/api/boards/${encodeURIComponent(dashboardId)}`, { method: 'PUT', body: dashboardConfig })
        if (message.value.startsWith('Synchronisation')) message.value = ''
      }).catch(() => {
        message.value = 'Synchronisation impossible : vos modifications restent enregistrées dans ce navigateur'
      })
      await remoteWriteQueue
    }, 450)
  }

  async function queueRemoteSaveAll(configurations = readAllDashboards()) {
    if (!remoteEnabled.value || !syncedUserId.value) return
    if (remoteSaveTimer) clearTimeout(remoteSaveTimer)
    const snapshot = JSON.parse(JSON.stringify(configurations)) as DashboardBackup[]
    const snapshotUserId = syncedUserId.value
    remoteWriteQueue = remoteWriteQueue.then(async () => {
      if (!canPersistDashboardSnapshot(snapshotUserId, syncedUserId.value, remoteEnabled.value)) return
      await $fetch('/api/boards', { method: 'PUT', body: { dashboards: snapshot } })
      if (message.value.startsWith('Synchronisation')) message.value = ''
    }).catch(() => {
      message.value = 'Synchronisation impossible : vos modifications restent enregistrées dans ce navigateur'
    })
    await remoteWriteQueue
  }

  function persist() {
    try {
      localStorage.setItem(dashboardStorageKey(activeDashboard.value), JSON.stringify(config.value))
      if (!message.value.startsWith('Synchronisation')) message.value = ''
    } catch { message.value = 'Stockage indisponible : les modifications ne sont pas enregistrées' }
    queueRemoteSave()
  }

  function init(dashboard?: DashboardId) {
    loadDashboardList()
    const selected = (dashboard ? dashboards.value.find(item => item.id === dashboard) : undefined) ?? orderedDashboards()[0]
    const id = selected?.id ?? 'daily'
    if (ready.value && activeDashboard.value === id) return
    activeDashboard.value = id
    config.value = defaultDashboard(id)
    history.value = []
    message.value = ''
    try {
      const raw = localStorage.getItem(dashboardStorageKey(id))
      if (raw) {
        const parsed = parseBoard(JSON.parse(raw))
        if (!parsed) throw new Error('Invalid configuration')
        config.value = dashboardIds.includes(id) ? upgradeDashboardDefaults(id, parsed) : parsed
        if (JSON.stringify(config.value) !== raw) persist()
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

  function writeCollection(nextDashboards: DashboardDefinition[], configs: Record<string, BoardConfig>) {
    const previous = new Map<string, string | null>()
    const definitions = orderedDashboards()
    const ids = new Set([...definitions.map(item => item.id), ...nextDashboards.map(item => item.id)])
    try {
      previous.set(dashboardListStorageKey, localStorage.getItem(dashboardListStorageKey))
      for (const id of ids) previous.set(dashboardStorageKey(id), localStorage.getItem(dashboardStorageKey(id)))
      localStorage.setItem(dashboardListStorageKey, JSON.stringify(nextDashboards))
      for (const id of ids) {
        if (!(id in configs)) localStorage.removeItem(dashboardStorageKey(id))
      }
      for (const [id, board] of Object.entries(configs)) localStorage.setItem(dashboardStorageKey(id), JSON.stringify(board))
      return true
    } catch {
      for (const [key, value] of previous) {
        try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value) }
        catch { /* Best-effort rollback if browser storage becomes unavailable. */ }
      }
      message.value = 'Stockage indisponible : les tableaux n’ont pas été modifiés'
      return false
    }
  }

  function updateDashboardList(next: DashboardDefinition[], activeId = activeDashboard.value) {
    const definitions = parseDashboardDefinitions(next.map((item, order) => ({ ...item, order })))
    if (!definitions) { message.value = 'Nom ou liste de tableaux invalide'; return false }
    const configurations = Object.fromEntries(definitions.map(item => [item.id, readDashboard(item.id)]))
    if (!writeCollection(definitions, configurations)) return false
    dashboards.value = definitions
    dashboardListLoaded = true
    if (!definitions.some(item => item.id === activeId)) activeId = definitions[0]!.id
    if (ready.value && activeDashboard.value !== activeId) {
      activeDashboard.value = activeId
      config.value = configurations[activeId]!
      history.value = []
    }
    message.value = ''
    void queueRemoteSaveAll(readAllDashboards())
    return true
  }

  function readDashboard(id: string): BoardConfig {
    if (ready.value && activeDashboard.value === id) return config.value
    try {
      const raw = localStorage.getItem(dashboardStorageKey(id))
      if (!raw) return defaultDashboard(id)
      const parsed = parseBoard(JSON.parse(raw))
      if (!parsed) throw new Error(`Configuration illisible pour le tableau ${id}`)
      return dashboardIds.includes(id) ? upgradeDashboardDefaults(id, parsed) : parsed
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : `Configuration illisible pour le tableau ${id}`)
    }
  }

  function createDashboard(title: string) {
    const normalized = title.trim()
    if (!normalized || normalized.length > 40 || orderedDashboards().some(item => item.title.toLocaleLowerCase('fr') === normalized.toLocaleLowerCase('fr'))) {
      message.value = 'Choisissez un nom de 1 à 40 caractères, différent des autres tableaux.'
      return null
    }
    const id = crypto.randomUUID()
    const next = [...orderedDashboards(), { id, title: normalized, order: dashboards.value.length }]
    const configs = Object.fromEntries(next.map(item => [item.id, item.id === id ? defaultDashboard(id) : readDashboard(item.id)]))
    if (!writeCollection(next, configs)) return null
    dashboards.value = next
    activeDashboard.value = id
    config.value = defaultDashboard(id)
    ready.value = true
    history.value = []
    message.value = ''
    void queueRemoteSaveAll(readAllDashboards())
    return id
  }

  function renameDashboard(id: string, title: string) {
    const normalized = title.trim()
    if (!normalized || normalized.length > 40 || orderedDashboards().some(item => item.id !== id && item.title.toLocaleLowerCase('fr') === normalized.toLocaleLowerCase('fr'))) {
      message.value = 'Choisissez un nom de 1 à 40 caractères, différent des autres tableaux.'
      return false
    }
    return updateDashboardList(orderedDashboards().map(item => item.id === id ? { ...item, title: normalized } : item))
  }

  function moveDashboard(id: string, direction: -1 | 1) {
    const next = orderedDashboards()
    const index = next.findIndex(item => item.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= next.length) return false
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    return updateDashboardList(next)
  }

  function reorderDashboard(id: string, targetId: string) {
    const next = orderedDashboards()
    const sourceIndex = next.findIndex(item => item.id === id)
    const targetIndex = next.findIndex(item => item.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return false
    const [moved] = next.splice(sourceIndex, 1)
    next.splice(targetIndex, 0, moved!)
    return updateDashboardList(next)
  }

  function reorderDashboards(ids: string[]) {
    const current = orderedDashboards()
    if (ids.length !== current.length || new Set(ids).size !== current.length) return false
    const byId = new Map(current.map(item => [item.id, item]))
    if (ids.some(id => !byId.has(id))) return false
    if (ids.every((id, index) => current[index]?.id === id)) return false
    return updateDashboardList(ids.map((id, order) => ({ ...byId.get(id)!, order })))
  }

  function deleteDashboard(id: string) {
    const next = orderedDashboards().filter(item => item.id !== id)
    if (next.length === dashboards.value.length || next.length === 0) {
      message.value = 'Conservez au moins un tableau.'
      return false
    }
    return updateDashboardList(next, next[0]!.id)
  }

  function deleteAllDashboards() {
    const current = orderedDashboards().find(item => item.id === activeDashboard.value) ?? orderedDashboards()[0]
    if (!current) return false
    const next = [{ ...current, order: 0 }]
    const emptyConfig: BoardConfig = { version: 1, widgets: [] }
    if (!writeCollection(next, { [current.id]: emptyConfig })) return false
    dashboards.value = next
    activeDashboard.value = current.id
    config.value = emptyConfig
    history.value = []
    message.value = ''
    ready.value = true
    void queueRemoteSaveAll(readAllDashboards())
    return true
  }

  function resetDispositions() {
    const next = defaultDashboardDefinitions.map(item => ({ ...item }))
    const configs = Object.fromEntries(next.map(item => [item.id, defaultDashboard(item.id)]))
    if (!writeCollection(next, configs)) return false
    dashboards.value = next
    const active = next.some(item => item.id === activeDashboard.value) ? activeDashboard.value : 'daily'
    activeDashboard.value = active
    config.value = configs[active]!
    history.value = []
    message.value = ''
    ready.value = true
    void queueRemoteSaveAll(readAllDashboards())
    return true
  }

  function readAllDashboards(): DashboardBackup[] {
    loadDashboardList()
    return orderedDashboards().map((definition, order) => ({ ...definition, order, config: readDashboard(definition.id) }))
  }

  function replaceAllDashboards(items: DashboardBackup[]) {
    const definitions = parseDashboardDefinitions(items.map(({ id, title }, order) => ({ id, title, order })))
    if (!definitions || definitions.length !== items.length) {
      message.value = 'Configuration invalide : la liste des tableaux ne peut pas être importée'
      return false
    }
    const configurations: Record<string, BoardConfig> = {}
    for (const item of items) {
      const parsed = parseBoard(item.config)
      if (!parsed) { message.value = `Configuration invalide pour le tableau ${item.title}`; return false }
      configurations[item.id] = dashboardIds.includes(item.id) ? upgradeDashboardDefaults(item.id, parsed) : parsed
    }
    if (!writeCollection(definitions, configurations)) return false
    dashboards.value = definitions
    dashboardListLoaded = true
    const active = definitions.some(item => item.id === activeDashboard.value) ? activeDashboard.value : definitions[0]!.id
    activeDashboard.value = active
    config.value = configurations[active]!
    ready.value = true
    history.value = []
    message.value = ''
    void queueRemoteSaveAll(readAllDashboards())
    return true
  }

  async function syncWithAccount() {
    const session = useUserSession()
    const userId = session.user.value?.id
    if (!userId) {
      remoteEnabled.value = false
      syncedUserId.value = ''
      accountHandle.value = ''
      return
    }
    if (syncedUserId.value === userId && remoteEnabled.value) return

    remoteEnabled.value = false
    syncedUserId.value = ''
    try {
      const localOwner = localStorage.getItem(dashboardStorageOwnerKey)
      const result = await $fetch<{ dashboards: DashboardBackup[]; hasStoredDashboards: boolean; accountHandle: string }>('/api/boards')
      accountHandle.value = result.accountHandle
      if (result.hasStoredDashboards) {
        if (!replaceAllDashboards(result.dashboards)) throw new Error('Impossible de charger les tableaux du compte.')
      } else if (shouldDiscardForeignDashboardCache(localOwner, userId, result.hasStoredDashboards)) {
        const freshDashboards = defaultDashboardDefinitions.map(definition => ({ ...definition, config: defaultDashboard(definition.id) }))
        if (!replaceAllDashboards(freshDashboards)) throw new Error('Impossible d’initialiser les tableaux de ce compte.')
        await $fetch('/api/boards', { method: 'PUT', body: { dashboards: readAllDashboards() } })
      } else {
        await $fetch('/api/boards', { method: 'PUT', body: { dashboards: readAllDashboards() } })
      }
      localStorage.setItem(dashboardStorageOwnerKey, userId)
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
    accountHandle.value = ''
  }

  function setAccountHandle(handle: string) { accountHandle.value = handle }

  function loadSharedDashboard(id: DashboardId, title: string, sharedConfig: BoardConfig) {
    disableRemoteSync()
    activeDashboard.value = id
    dashboards.value = [{ id, title, order: 0 }]
    config.value = JSON.parse(JSON.stringify(sharedConfig)) as BoardConfig
    history.value = []
    message.value = ''
    ready.value = true
  }

  function clearSharedDashboard() {
    disableRemoteSync()
    activeDashboard.value = 'daily'
    dashboards.value = defaultDashboardDefinitions.map(item => ({ ...item }))
    config.value = defaultDashboard('daily')
    history.value = []
    message.value = ''
    ready.value = false
  }

  return {
    activeDashboard, dashboards, config, ready, message, history, widgets, accountHandle,
    init, setLayout, saveWidget, removeWidget, undo, createDashboard, renameDashboard,
    moveDashboard, reorderDashboard, reorderDashboards, deleteDashboard, deleteAllDashboards, resetDispositions, readAllDashboards,
    replaceAllDashboards, syncWithAccount, disableRemoteSync, setAccountHandle,
    loadSharedDashboard, clearSharedDashboard,
  }
})
