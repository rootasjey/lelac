import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBoardStore } from '../app/stores/board'
import { dashboardStorageKey, defaultDashboard, widgetDefaults } from '../app/utils/boardConfig'

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
    expect(exported.daily.widgets.some(widget => widget.id === 'extra-feed')).toBe(true)
    expect(exported.cinema.widgets.some(widget => widget.id === 'cinema-trailers')).toBe(false)

    const replacement = {
      daily: defaultDashboard('daily'),
      tech: defaultDashboard('tech'),
      cinema: { ...defaultDashboard('cinema'), options: { showTrailers: false } },
    }
    expect(store.replaceAllDashboards(replacement)).toBe(true)
    expect(store.config).toEqual(replacement.cinema)
    expect(JSON.parse(localStorage.getItem(dashboardStorageKey('daily'))!)).toEqual(replacement.daily)
    expect(JSON.parse(localStorage.getItem(dashboardStorageKey('tech'))!)).toEqual(replacement.tech)
    expect(JSON.parse(localStorage.getItem(dashboardStorageKey('cinema'))!)).toEqual(replacement.cinema)

    store.saveWidget({ ...store.widgets[0]!, title: 'Cinéma personnalisé' })
    expect(store.config.options).toEqual({ showTrailers: false })
  })
})
