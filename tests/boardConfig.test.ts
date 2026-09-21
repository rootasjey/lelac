// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { defaultBoard, parseBoard, widgetDefaults } from '../app/utils/boardConfig'
import { normalizeFeed } from '../shared/utils/feed'

describe('board configuration', () => {
  it('uses the public demo feed for new boards', () => {
    const board = defaultBoard()
    expect(board.widgets[0]?.title).toBe('The Conversation · À la une')
    expect(board.widgets[0]?.feedUrl).toBe('https://theconversation.com/us/articles.atom')
  })

  it('restores geometry and widget preferences, including an empty board', () => {
    const board = defaultBoard()
    board.widgets[0]!.feedUrl = 'https://selfh.st/rss/'
    board.widgets[0]!.title = 'Ma veille'
    expect(parseBoard(JSON.parse(JSON.stringify(board)))).toEqual(board)
    expect(parseBoard({ version: 1, widgets: [] })).toEqual({ version: 1, widgets: [] })
  })
  it('rejects collisions, duplicate ids, unknown widgets and malformed settings', () => {
    for (const patch of [{ x: 8 }, { id: 'weather' }, { type: 'unknown' }, { feedUrl: 'javascript:alert(1)' }, { w: 3.5 }]) {
      const board = defaultBoard()
      Object.assign(board.widgets[0]!, patch)
      expect(parseBoard(board)).toBeNull()
    }
    const board = defaultBoard()
    board.widgets[2]!.cities = [{ name: 'Paris', timezone: 'not-a-timezone' }]
    expect(parseBoard(board)).toBeNull()
  })
  it('supports independent instances of the same widget type', () => {
    const board = defaultBoard()
    board.widgets.push({ ...widgetDefaults('rss', 'second-feed'), y: 10 })
    expect(parseBoard(board)?.widgets).toHaveLength(4)
  })
})

describe('feed normalization', () => {
  it('filters unsafe links and normalizes provider UTC dates without guessing invalid dates', () => {
    const data = normalizeFeed({ feed: { title: 'Example' }, items: [
      { title: 'Article', link: 'https://example.org/post', pubDate: '2026-09-16 10:00:00' },
      { title: 'Bad', link: 'javascript:alert(1)' },
      { title: 'No date', link: 'https://example.org/other', pubDate: 'unknown' },
    ] }, 'https://example.org/rss')
    expect(data.articles).toHaveLength(2)
    expect(data.articles[0]?.date).toBe('2026-09-16T10:00:00.000Z')
    expect(data.articles[1]?.date).toBe('')
  })
})
