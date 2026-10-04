import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBoardStore } from '../app/stores/board'
import { canPersistDashboardSnapshot, dashboardListStorageKey, dashboardStorageKey, defaultDashboard, defaultDashboardDefinitions, shouldDiscardForeignDashboardCache, widgetDefaults } from '../app/utils/boardConfig'

const storage = new Map<string, string>()

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, String(value)),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  storage.clear()
})

describe('board undo', () => {
  it('restores preferences and geometry after deletion and layout changes', () => {
    setActivePinia(createPinia())
    const store = useBoardStore()
    const before = JSON.parse(JSON.stringify(store.config))
    store.removeWidget('weather')
    expect(store.widgets).toHaveLength(2)
    store.undo()
    expect(store.config).toEqual(before)
    store.setLayout(store.widgets.map(w => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.id === 'news' ? 8 : w.h })))
    expect(store.widgets[0]?.h).toBe(8)
    store.undo()
    expect(store.config).toEqual(before)
  })

  it('adds at the bottom and reverses additions and setting changes', () => {
    setActivePinia(createPinia())
    const store = useBoardStore()
    store.saveWidget(widgetDefaults('clock', 'new-clock'))
    expect(store.widgets.at(-1)?.y).toBe(10)
    store.undo()
    expect(store.widgets).toHaveLength(3)
    store.saveWidget({ ...store.widgets[0]!, title: 'Nouveau titre' })
    expect(store.widgets[0]?.title).toBe('Nouveau titre')
    store.undo()
    expect(store.widgets[0]?.title).toBe('The Conversation · À la une')
  })

  it('keeps daily and Tech configurations separate and restores the daily board', () => {
    setActivePinia(createPinia())
    const store = useBoardStore()

    store.init('daily')
    store.saveWidget({ ...widgetDefaults('rss', 'daily-extra'), title: 'Lecture quotidienne', feedUrl: 'https://example.org/feed.xml', y: 10 })
    const dailySnapshot = localStorage.getItem(dashboardStorageKey('daily'))
    localStorage.setItem(dashboardStorageKey('tech'), JSON.stringify({
      version: 1,
      widgets: [{
        id: 'google-developers',
        type: 'youtube',
        title: 'Google Developers',
        x: 0,
        y: 0,
        w: 12,
        h: 8,
        channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
        grayscale: false,
      }],
    }))

    store.init('tech')
    expect(store.activeDashboard).toBe('tech')
    expect(store.widgets).toHaveLength(6)
    expect(store.widgets[0]).toMatchObject({ id: 'google-developers', channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw' })
    expect(store.widgets.slice(1).map(widget => widget.id)).toEqual(['github-blog', 'cloudflare-workers-ai', 'github-trending-repositories', 'github-trending-developers', 'openrouter-models'])
    expect(localStorage.getItem(dashboardStorageKey('tech'))).not.toBeNull()

    store.init('daily')
    expect(store.activeDashboard).toBe('daily')
    expect(store.widgets.some(widget => widget.title === 'Lecture quotidienne')).toBe(true)
    expect(localStorage.getItem(dashboardStorageKey('daily'))).toBe(dailySnapshot)
  })

  it('restores all three dashboard layouts and refreshes the active board', () => {
    setActivePinia(createPinia())
    const store = useBoardStore()
    store.init('daily')
    store.removeWidget('news')
    store.init('tech')
    store.removeWidget('google-developers')
    store.init('cinema')
    store.removeWidget('cinema-programme')

    expect(store.resetDispositions()).toBe(true)
    expect(store.widgets).toEqual(defaultDashboard('cinema').widgets)
    for (const dashboard of ['daily', 'tech', 'cinema'] as const) {
      expect(JSON.parse(localStorage.getItem(dashboardStorageKey(dashboard))!)).toEqual(defaultDashboard(dashboard))
    }
    expect(store.history).toEqual([])
  })

  it('exports every saved dashboard and replaces them together on import', () => {
    setActivePinia(createPinia())
    const store = useBoardStore()
    store.init('daily')
    store.saveWidget({ ...widgetDefaults('rss', 'extra-feed'), title: 'Extra', feedUrl: 'https://example.org/feed.xml', y: 10 })
    store.init('cinema')
    store.removeWidget('cinema-trailers')

    const exported = store.readAllDashboards()
    expect(exported.find(item => item.id === 'daily')?.config.widgets.some(widget => widget.id === 'extra-feed')).toBe(true)
    expect(exported.find(item => item.id === 'cinema')?.config.widgets.some(widget => widget.id === 'cinema-trailers')).toBe(false)

    const replacement = defaultDashboardDefinitions.map(definition => ({
      ...definition,
      config: definition.id === 'cinema' ? { ...defaultDashboard('cinema'), options: { showTrailers: false } } : defaultDashboard(definition.id),
    }))
    expect(store.replaceAllDashboards(replacement)).toBe(true)
    expect(store.config).toEqual(replacement[2]!.config)
    expect(JSON.parse(localStorage.getItem(dashboardStorageKey('daily'))!)).toEqual(replacement[0]!.config)
    expect(JSON.parse(localStorage.getItem(dashboardStorageKey('tech'))!)).toEqual(replacement[1]!.config)
    expect(JSON.parse(localStorage.getItem(dashboardStorageKey('cinema'))!)).toEqual(replacement[2]!.config)
    expect(JSON.parse(localStorage.getItem(dashboardListStorageKey)!)).toEqual(defaultDashboardDefinitions)

    store.saveWidget({ ...store.widgets[0]!, title: 'Cinéma personnalisé' })
    expect(store.config.options).toEqual({ showTrailers: false })
  })

  it('creates, renames, reorders, and deletes a user dashboard while retaining one', () => {
    setActivePinia(createPinia())
    const store = useBoardStore()
    store.init('daily')
    const id = store.createDashboard('Voyages')!
    expect(store.activeDashboard).toBe(id)
    expect(store.config.widgets).toEqual([])
    expect(store.renameDashboard(id, 'Carnets')).toBe(true)
    expect(store.dashboards.at(-1)).toMatchObject({ id, title: 'Carnets', order: 3 })
    expect(store.moveDashboard(id, -1)).toBe(true)
    expect(store.dashboards[2]).toMatchObject({ id, title: 'Carnets', order: 2 })
    expect(JSON.parse(localStorage.getItem(dashboardListStorageKey)!)).toEqual(store.dashboards)
    expect(store.deleteDashboard(id)).toBe(true)
    expect(store.dashboards.map(item => item.id)).toEqual(['daily', 'tech', 'cinema'])
    expect(localStorage.getItem(dashboardStorageKey(id))).toBeNull()
    expect(store.deleteDashboard('daily')).toBe(true)
    expect(store.deleteDashboard('tech')).toBe(true)
    expect(store.deleteDashboard('cinema')).toBe(false)
    expect(store.dashboards).toHaveLength(1)
  })

  it('reorders dashboards by dropping one tab onto another', () => {
    setActivePinia(createPinia())
    const store = useBoardStore()
    store.init('daily')

    expect(store.reorderDashboard('cinema', 'daily')).toBe(true)
    expect(store.dashboards.map(item => item.id)).toEqual(['cinema', 'daily', 'tech'])
    expect(JSON.parse(localStorage.getItem(dashboardListStorageKey)!)).toEqual(store.dashboards)
  })

  it('persists a complete dashboard order from the management list', () => {
    setActivePinia(createPinia())
    const store = useBoardStore()
    store.init('daily')
    const extraId = store.createDashboard('Voyages')!
    store.renameDashboard(extraId, 'Escapades')

    expect(store.reorderDashboards([extraId, 'cinema', 'daily', 'tech'])).toBe(true)
    expect(store.dashboards.map(item => [item.id, item.title, item.order])).toEqual([
      [extraId, 'Escapades', 0],
      ['cinema', 'Cinéma', 1],
      ['daily', 'Quotidien', 2],
      ['tech', 'Tech', 3],
    ])
    expect(JSON.parse(localStorage.getItem(dashboardListStorageKey)!)).toEqual(store.dashboards)
    expect(store.reorderDashboards([extraId, 'cinema', 'daily', 'missing'])).toBe(false)
    expect(store.reorderDashboards([extraId, extraId, 'daily', 'tech'])).toBe(false)
  })

  it('clears every dashboard but keeps the active one as an empty board', () => {
    setActivePinia(createPinia())
    const store = useBoardStore()
    store.init('daily')
    const temporaryId = store.createDashboard('À supprimer')!
    store.saveWidget(widgetDefaults('clock', 'temporary-clock'))

    expect(store.deleteAllDashboards()).toBe(true)
    expect(store.dashboards).toEqual([{ id: temporaryId, title: 'À supprimer', order: 0 }])
    expect(store.activeDashboard).toBe(temporaryId)
    expect(store.widgets).toEqual([])
    expect(localStorage.getItem(dashboardStorageKey('daily'))).toBeNull()
  })

  it('uses the first dashboard as the home dashboard after reordering', () => {
    setActivePinia(createPinia())
    const store = useBoardStore()
    store.init()
    expect(store.activeDashboard).toBe('daily')
    expect(store.moveDashboard('daily', 1)).toBe(true)
    store.init()
    expect(store.dashboards[0]?.id).toBe('tech')
    expect(store.activeDashboard).toBe('tech')
    expect(store.config).toEqual(defaultDashboard('tech'))
  })

  it('loads a public dashboard as read-only ephemeral state without writing it to browser storage', () => {
    setActivePinia(createPinia())
    const store = useBoardStore()
    store.init('daily')
    const dailySnapshot = localStorage.getItem(dashboardStorageKey('daily'))
    const sharedConfig = { ...defaultDashboard('tech'), widgets: [] }

    store.loadSharedDashboard('tech', 'Aperçu public', sharedConfig)
    expect(store.dashboards).toEqual([{ id: 'tech', title: 'Aperçu public', order: 0 }])
    expect(store.config).toEqual(sharedConfig)
    expect(store.ready).toBe(true)
    expect(store.accountHandle).toBe('')
    expect(localStorage.getItem(dashboardStorageKey('daily'))).toBe(dailySnapshot)
    expect(localStorage.getItem(dashboardStorageKey('tech'))).toBeNull()

    store.clearSharedDashboard()
    expect(store.ready).toBe(false)
    expect(store.dashboards.map(item => item.id)).toEqual(['daily', 'tech', 'cinema'])
  })

  it('only discards a foreign account cache when the remote account has no saved dashboards', () => {
    expect(shouldDiscardForeignDashboardCache('account-a', 'account-b', false)).toBe(true)
    expect(shouldDiscardForeignDashboardCache('account-b', 'account-b', false)).toBe(false)
    expect(shouldDiscardForeignDashboardCache(null, 'account-b', false)).toBe(false)
    expect(shouldDiscardForeignDashboardCache('account-a', 'account-b', true)).toBe(false)
  })

  it('only sends queued dashboard writes while the creating account is still connected', () => {
    expect(canPersistDashboardSnapshot('account-a', 'account-a', true)).toBe(true)
    expect(canPersistDashboardSnapshot('account-a', 'account-b', true)).toBe(false)
    expect(canPersistDashboardSnapshot('account-a', 'account-a', false)).toBe(false)
  })
})
