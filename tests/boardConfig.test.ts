// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { defaultBoard, parseBoard, widgetDefaults } from '../app/utils/boardConfig'
import { normalizeFeedUrl } from '../shared/utils/feedUrl'
import { parseFeedXml } from '../shared/utils/feed'
import { normalizeYoutubeChannelId, youtubeChannelHandleFromInput, youtubePublishedDateLabel } from '../shared/utils/youtubeFeed'

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
  it('accepts a YouTube widget with a valid channel ID', () => {
    const board = defaultBoard()
    const widget = { ...widgetDefaults('youtube', 'videos'), channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw', y: 9 }
    expect(widget.h).toBe(6)
    board.widgets.push(widget)
    expect(parseBoard(board)?.widgets.at(-1)?.type).toBe('youtube')
    board.widgets.at(-1)!.channelId = 'UC_not-a-valid-channel'
    expect(parseBoard(board)).toBeNull()
  })
  it('persists the YouTube thumbnail grayscale preference and rejects invalid values', () => {
    const defaults = widgetDefaults('youtube', 'videos')
    expect(defaults.grayscale).toBe(false)

    const legacyBoard = defaultBoard()
    const legacyWidget = { ...defaults, channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw', y: 9 }
    delete legacyWidget.grayscale
    legacyBoard.widgets.push(legacyWidget)
    expect(parseBoard(legacyBoard)).not.toBeNull()

    const board = defaultBoard()
    board.widgets.push({ ...defaults, channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw', grayscale: true, y: 9 })
    expect(parseBoard(board)?.widgets.at(-1)).toMatchObject({ type: 'youtube', grayscale: true })
    board.widgets.at(-1)!.grayscale = 'yes' as unknown as boolean
    expect(parseBoard(board)).toBeNull()
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

describe('YouTube channel and video links', () => {
  const channelId = 'UC_x5XG1OV2P6uZZ5FSM9Ttw'

  it('accepts channel IDs, channel URLs, and YouTube Atom feed URLs', () => {
    expect(normalizeYoutubeChannelId(channelId)).toBe(channelId)
    expect(normalizeYoutubeChannelId(`youtube.com/channel/${channelId}/videos`)).toBe(channelId)
    expect(normalizeYoutubeChannelId(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`)).toBe(channelId)
  })

  it('rejects handle URLs and non-YouTube hosts rather than guessing a channel', () => {
    expect(normalizeYoutubeChannelId('https://www.youtube.com/@GoogleDevelopers')).toBeNull()
    expect(youtubeChannelHandleFromInput('https://www.youtube.com/@GoogleDevelopers')).toBe('GoogleDevelopers')
    expect(youtubeChannelHandleFromInput('youtube.com/@LesRevuesduMonde/videos')).toBe('LesRevuesduMonde')
    expect(youtubeChannelHandleFromInput('@LesRevuesduMonde')).toBe('LesRevuesduMonde')
    expect(youtubeChannelHandleFromInput('https://youtube.com.evil.example/@GoogleDevelopers')).toBeNull()
    expect(youtubeChannelHandleFromInput('https://www.youtube.com/@bad!handle')).toBeNull()
    expect(normalizeYoutubeChannelId(`https://youtube.com.evil.example/channel/${channelId}`)).toBeNull()
    expect(normalizeYoutubeChannelId('UC_too-short')).toBeNull()
  })

  it('extracts video IDs only from supported YouTube links', async () => {
    const { youtubeVideoIdFromUrl } = await import('../shared/utils/youtubeFeed')
    expect(youtubeVideoIdFromUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(youtubeVideoIdFromUrl('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe('dQw4w9WgXcQ')
    expect(youtubeVideoIdFromUrl('https://videos.example/watch?v=dQw4w9WgXcQ')).toBeNull()
  })

  it('shows recent publication dates relatively and older dates absolutely', () => {
    const now = Date.parse('2026-09-21T10:00:00Z')
    const sixDaysAgo = new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString()
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()

    expect(youtubePublishedDateLabel(sixDaysAgo, now)).toBe('il y a 6 jours')
    expect(youtubePublishedDateLabel(sevenDaysAgo, now)).toBe(
      new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(sevenDaysAgo)),
    )
    expect(youtubePublishedDateLabel('not-a-date', now)).toBe('')
  })
})
