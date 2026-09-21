import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBoardStore } from '../app/stores/board'
import { dashboardStorageKey, widgetDefaults } from '../app/utils/boardConfig'

const storage = new Map<string, string>()

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, String(value)),
    removeItem: (key: string) => storage.delete(key),
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

    store.init('tech')
    expect(store.activeDashboard).toBe('tech')
    expect(store.widgets).toHaveLength(1)
    expect(store.widgets[0]).toMatchObject({ id: 'google-developers', channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw' })
    expect(localStorage.getItem(dashboardStorageKey('tech'))).not.toBeNull()

    store.init('daily')
    expect(store.activeDashboard).toBe('daily')
    expect(store.widgets.some(widget => widget.title === 'Lecture quotidienne')).toBe(true)
    expect(localStorage.getItem(dashboardStorageKey('daily'))).toBe(dailySnapshot)
  })
})
