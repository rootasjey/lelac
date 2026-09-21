// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { defaultBoard, parseBoard, widgetDefaults } from '../app/utils/boardConfig'
import { normalizeFeedUrl } from '../shared/utils/feedUrl'
import { parseFeedXml } from '../shared/utils/feed'

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
  it('parses Atom entries and resolves their links relative to the feed', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>The Conversation &amp; Ideas</title>
        <entry>
          <title>Research &amp; public life</title>
          <link rel="alternate" href="https://theconversation.com/us/story-1" />
          <published>2026-09-21T01:02:00Z</published>
        </entry>
        <entry>
          <title>Another story</title>
          <link href="story-2" />
          <updated>2026-09-20T18:00:00+02:00</updated>
        </entry>
      </feed>`
    const data = parseFeedXml(xml, 'https://theconversation.com/us/articles.atom')
    expect(data.source).toBe('The Conversation & Ideas')
    expect(data.articles).toHaveLength(2)
    expect(data.articles[0]).toMatchObject({
      title: 'Research & public life',
      link: 'https://theconversation.com/us/story-1',
      date: '2026-09-21T01:02:00.000Z',
    })
    expect(data.articles[1]?.link).toBe('https://theconversation.com/us/story-2')
  })

  it('parses RSS, decodes escaped links, and filters unsafe article URLs', () => {
    const xml = `<rss version="2.0"><channel><title>Example News</title>
      <item><title><![CDATA[An article &amp; more]]></title><link>https://example.org/story?a=1&amp;b=2</link><pubDate>Mon, 21 Sep 2026 01:02:00 GMT</pubDate></item>
      <item><title>Unsafe</title><link>javascript:alert(1)</link></item>
      <item><title>No date</title><link>/relative</link><pubDate>unknown</pubDate></item>
    </channel></rss>`
    const data = parseFeedXml(xml, 'https://example.org/rss.xml')
    expect(data.source).toBe('Example News')
    expect(data.articles).toHaveLength(2)
    expect(data.articles[0]).toMatchObject({
      title: 'An article & more',
      link: 'https://example.org/story?a=1&b=2',
      date: '2026-09-21T01:02:00.000Z',
    })
    expect(data.articles[1]).toMatchObject({ link: 'https://example.org/relative', date: '' })
  })

  it('accepts only public HTTPS feed URLs', () => {
    expect(normalizeFeedUrl('https://theconversation.com/us/articles.atom')?.href).toBe('https://theconversation.com/us/articles.atom')
    for (const url of [
      'http://example.org/rss.xml',
      'https://localhost/feed.xml',
      'https://127.0.0.1/feed.xml',
      'https://internal.local/feed.xml',
      'https://user:pass@example.org/feed.xml',
      'https://example.org:8443/feed.xml',
    ]) expect(normalizeFeedUrl(url)).toBeNull()
  })

  it('rejects unsupported documents and XML entities declared by the feed', () => {
    expect(() => parseFeedXml('<html><body>No feed</body></html>', 'https://example.org/feed.xml')).toThrow()
    expect(() => parseFeedXml('<!DOCTYPE feed [<!ENTITY x "hello">]><feed>&x;</feed>', 'https://example.org/feed.xml')).toThrow()
  })
})
