import { describe, it, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBoardStore } from '../app/stores/board'
import { widgetDefaults } from '../app/utils/boardConfig'

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
})
