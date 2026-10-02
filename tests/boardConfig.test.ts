// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { dashboardStorageKey, defaultBoard, defaultDashboard, parseBoard, parseDashboardDefinitions, upgradeDashboardDefaults, widgetDefaults } from '../app/utils/boardConfig'
import { normalizeFeedUrl } from '../shared/utils/feedUrl'
import { parseFeedXml } from '../shared/utils/feed'
import { normalizeYoutubeChannelId, youtubeChannelHandleFromInput, youtubePublishedDateLabel, youtubeThumbnailCandidates } from '../shared/utils/youtubeFeed'
import { parseGitHubTrendingDevelopersHtml, parseGitHubTrendingHtml } from '../shared/utils/githubTrending'
import { normalizeHackerNewsStory } from '../shared/utils/hackerNews'

describe('board configuration', () => {
  it('validates a forward-compatible, ordered list of user dashboards', () => {
    const valid = [
      { id: 'daily', title: 'Quotidien', order: 0 },
      { id: '123e4567-e89b-42d3-a456-426614174000', title: 'Voyages', order: 1 },
    ]
    expect(parseDashboardDefinitions(valid)).toEqual(valid)
    expect(parseDashboardDefinitions([...valid, { id: valid[0]!.id, title: 'Duplicate ID', order: 2 }])).toBeNull()
    expect(parseDashboardDefinitions([{ ...valid[0]!, title: ' ' }])).toBeNull()
    expect(parseDashboardDefinitions([{ ...valid[0]!, order: 1 }])).toBeNull()
    expect(parseDashboardDefinitions([{ id: 'not-a-stable-id', title: 'Invalid ID', order: 0 }])).toBeNull()
  })

  it('uses the public demo feed for new boards', () => {
    const board = defaultBoard()
    expect(board.widgets[0]?.title).toBe('The Conversation · À la une')
    expect(board.widgets[0]?.feedUrl).toBe('https://theconversation.com/us/articles.atom')
  })

  it('provides a separate Tech dashboard without changing the legacy daily storage key', () => {
    expect(dashboardStorageKey('daily')).toBe('lelac:board:v1')
    expect(dashboardStorageKey('tech')).toBe('lelac:board:v1:tech')
    const tech = defaultDashboard('tech')
    expect(tech.widgets).toEqual([expect.objectContaining({
      id: 'google-developers',
      type: 'youtube',
      title: 'Google Developers',
      channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
      grayscale: false,
      w: 12,
      h: 8,
    }), expect.objectContaining({
      id: 'github-blog',
      type: 'rss',
      title: 'GitHub Blog',
      feedUrl: 'https://github.blog/feed/',
      x: 0,
      y: 8,
      w: 6,
    }), expect.objectContaining({
      id: 'cloudflare-workers-ai',
      type: 'rss',
      title: 'Cloudflare · Workers AI',
      feedUrl: 'https://developers.cloudflare.com/changelog/rss/workers-ai.xml',
      x: 6,
      y: 8,
      w: 6,
    }), expect.objectContaining({
      id: 'github-trending-repositories',
      type: 'github-trending',
      githubPeriod: 'daily',
      githubLanguage: '',
      x: 0,
      y: 16,
      w: 12,
      h: 8,
    }), expect.objectContaining({
      id: 'github-trending-developers',
      type: 'github-developers-trending',
      githubPeriod: 'daily',
      githubLanguage: '',
      x: 0,
      y: 24,
      w: 12,
      h: 8,
    }), expect.objectContaining({
      id: 'openrouter-models',
      type: 'openrouter-models',
      title: 'Modèles d’IA récents',
      x: 0,
      y: 32,
      w: 12,
      h: 8,
    })])
    expect(parseBoard(tech)).not.toBeNull()
  })

  it('provides a Cinema dashboard with local screenings, trailers, and official streaming calendars by default', () => {
    expect(dashboardStorageKey('cinema')).toBe('lelac:board:v1:cinema')
    expect(defaultDashboard('cinema').widgets).toEqual([
      expect.objectContaining({
        id: 'cinema-programme',
        type: 'cinema',
        title: 'Séances de cinéma',
        cinemaLocation: { inseeCode: '78646', name: 'Versailles', department: '78', lat: 48.8014, lon: 2.1301 },
        w: 12,
      }),
      expect.objectContaining({
        id: 'cinema-trailers',
        type: 'youtube',
        title: 'Bandes-annonces · FilmsActu',
        channelId: 'UC_i8X3p8oZNaik8X513Zn1Q',
        w: 12,
        y: 9,
      }),
      expect.objectContaining({
        id: 'netflix-releases',
        type: 'netflix-releases',
        title: 'Sorties Netflix',
        w: 12,
        y: 17,
        h: 8,
      }),
      expect.objectContaining({
        id: 'apple-tv-releases',
        type: 'apple-tv-releases',
        title: 'Sorties Apple TV',
        w: 12,
        y: 25,
        h: 8,
      }),
      expect.objectContaining({
        id: 'prime-video-releases',
        type: 'prime-video-releases',
        title: 'Sorties Prime Video',
        w: 12,
        y: 33,
        h: 8,
      }),
      expect.objectContaining({
        id: 'disney-plus-announcements',
        type: 'disney-plus-announcements',
        title: 'Annonces Disney+',
        w: 12,
        y: 41,
        h: 8,
      }),
    ])
    expect(parseBoard(defaultDashboard('cinema'))).not.toBeNull()

    const invalidLocation = JSON.parse(JSON.stringify(defaultDashboard('cinema')))
    invalidLocation.widgets[0].cinemaLocation.lat = 120
    expect(parseBoard(invalidLocation)).toBeNull()
  })

  it('adds default Cinema widgets only to untouched saved seeds', () => {
    const previousSeed = { version: 1 as const, widgets: [widgetDefaults('cinema', 'cinema-programme')] }
    expect(upgradeDashboardDefaults('cinema', previousSeed)).toEqual(defaultDashboard('cinema'))

    const previousSeedWithTrailers = { version: 1 as const, widgets: defaultDashboard('cinema').widgets.slice(0, 2) }
    expect(upgradeDashboardDefaults('cinema', previousSeedWithTrailers)).toEqual(defaultDashboard('cinema'))

    const previousSeedWithNetflix = { version: 1 as const, widgets: defaultDashboard('cinema').widgets.slice(0, 3) }
    expect(upgradeDashboardDefaults('cinema', previousSeedWithNetflix)).toEqual(defaultDashboard('cinema'))

    const previousSeedWithAppleTv = { version: 1 as const, widgets: defaultDashboard('cinema').widgets.slice(0, 4) }
    expect(upgradeDashboardDefaults('cinema', previousSeedWithAppleTv)).toEqual(defaultDashboard('cinema'))

    const customized = JSON.parse(JSON.stringify(previousSeed)) as typeof previousSeed
    customized.widgets[0]!.cinemaLocation!.name = 'Toulouse'
    expect(upgradeDashboardDefaults('cinema', customized)).toBe(customized)
  })

  it('migrates stored cinema area settings to a canonical commune location', () => {
    const legacy = {
      version: 1,
      widgets: [{
        ...widgetDefaults('cinema', 'legacy-cinema'),
        cinemaLocation: undefined,
        cinemaArea: 'trappes',
      }],
    }
    const parsed = parseBoard(legacy)
    expect(parsed?.widgets[0]).toMatchObject({
      cinemaLocation: { inseeCode: '78621', name: 'Trappes', department: '78' },
    })
    expect(parsed?.widgets[0]).not.toHaveProperty('cinemaArea')
  })

  it('removes obsolete cinema event widgets while preserving the rest of a saved board', () => {
    const board: unknown = {
      version: 1 as const,
      widgets: [
        { ...widgetDefaults('cinema', 'local-showtimes'), type: 'cinema-events' },
        widgetDefaults('cinema-releases', 'upcoming-releases'),
      ],
    }

    expect(parseBoard(board)?.widgets).toEqual([widgetDefaults('cinema-releases', 'upcoming-releases')])
  })

  it('upgrades only the untouched one-widget Tech seed', () => {
    const oldSeed = {
      version: 1 as const,
      widgets: [{
        id: 'google-developers',
        type: 'youtube' as const,
        title: 'Google Developers',
        x: 0,
        y: 0,
        w: 12,
        h: 8,
        channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
        grayscale: false,
      }],
    }
    expect(upgradeDashboardDefaults('tech', oldSeed)).toEqual(defaultDashboard('tech'))
    expect(upgradeDashboardDefaults('tech', { version: 1, widgets: defaultDashboard('tech').widgets.slice(0, 3) })).toEqual(defaultDashboard('tech'))
    expect(upgradeDashboardDefaults('tech', { ...oldSeed, widgets: [{ ...oldSeed.widgets[0]!, grayscale: true }] })).toEqual({ ...oldSeed, widgets: [{ ...oldSeed.widgets[0]!, grayscale: true }] })
    expect(upgradeDashboardDefaults('daily', oldSeed)).toBe(oldSeed)
  })

  it('adds the model widget only when the saved Tech seed is still untouched', () => {
    const defaults = defaultDashboard('tech')
    const previousSeed = { version: 1 as const, widgets: defaults.widgets.filter(widget => widget.type !== 'openrouter-models') }
    expect(upgradeDashboardDefaults('tech', previousSeed)).toEqual(defaults)

    const customized = JSON.parse(JSON.stringify(previousSeed)) as typeof previousSeed
    customized.widgets[0]!.title = 'Mes vidéos'
    expect(upgradeDashboardDefaults('tech', customized)).toBe(customized)
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
  it('accepts an OpenRouter models widget without per-widget settings', () => {
    const board = defaultBoard()
    board.widgets.push({ ...widgetDefaults('openrouter-models', 'recent-models'), y: 10 })
    expect(parseBoard(board)?.widgets.at(-1)).toMatchObject({ type: 'openrouter-models', title: 'Modèles d’IA récents' })
  })

  it('offers Hacker News as an optional widget without adding it to the Tech seed', () => {
    expect(defaultDashboard('tech').widgets.some(widget => widget.type === 'hacker-news')).toBe(false)
    const board = defaultBoard()
    board.widgets.push({ ...widgetDefaults('hacker-news', 'hn'), y: 10 })
    expect(parseBoard(board)?.widgets.at(-1)).toMatchObject({ type: 'hacker-news', title: 'Hacker News' })
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
  it('keeps repository and developer trend filters independent', () => {
    const board = defaultBoard()
    board.widgets.push({ ...widgetDefaults('github-trending', 'repos'), githubPeriod: 'daily', githubLanguage: 'Rust', y: 10 })
    board.widgets.push({ ...widgetDefaults('github-developers-trending', 'developers'), githubPeriod: 'monthly', githubLanguage: 'Python', y: 18 })
    expect(parseBoard(board)?.widgets.slice(-2)).toEqual([
      expect.objectContaining({ type: 'github-trending', githubPeriod: 'daily', githubLanguage: 'Rust' }),
      expect.objectContaining({ type: 'github-developers-trending', githubPeriod: 'monthly', githubLanguage: 'Python' }),
    ])
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

describe('GitHub Trending normalization', () => {
  it('parses repository names, metadata and period star counts', () => {
    const html = `<article class="Box-row">
      <h2><a href="/owner/project"><span>owner /</span> project</a></h2>
      <p class="col-9 color-fg-muted my-1">A useful &amp; fast project</p>
      <span itemprop="programmingLanguage">TypeScript</span>
      <a href="/owner/project/stargazers">12,345</a>
      <a href="/owner/project/forks">678</a>
      <span>987 stars today</span>
    </article>`
    expect(parseGitHubTrendingHtml(html, 'daily', 'TypeScript')).toMatchObject({
      language: 'TypeScript',
      repositories: [{
        fullName: 'owner/project',
        description: 'A useful & fast project',
        language: 'TypeScript',
        stars: 12345,
        forks: 678,
        starsPeriod: 987,
        url: 'https://github.com/owner/project',
      }],
    })
  })

  it('parses developer profiles and their popular repositories', () => {
    const html = `<article class="Box-row d-flex">
      <a href="/octocat"><img src="https://avatars.githubusercontent.com/u/1?s=96&amp;v=4" alt="@octocat" /></a>
      <h1 class="h3 lh-condensed"><a href="/octocat">The Octocat</a></h1>
      <p class="f4"><a href="/octocat">octocat</a></p>
      <h1 class="h4 lh-condensed"><a href="/octocat/Hello-World">Hello-World</a></h1>
      <div class="f6 color-fg-muted mt-1">A sample repository</div>
    </article>`
    expect(parseGitHubTrendingDevelopersHtml(html, 'weekly', 'TypeScript')).toMatchObject({
      period: 'weekly',
      language: 'TypeScript',
      developers: [{
        username: 'octocat',
        displayName: 'The Octocat',
        avatarUrl: 'https://avatars.githubusercontent.com/u/1?s=96&v=4',
        popularRepository: 'Hello-World',
        popularRepositoryUrl: 'https://github.com/octocat/Hello-World',
        popularRepositoryDescription: 'A sample repository',
      }],
    })
  })

  it('normalizes safe Hacker News stories and keeps discussion metadata', () => {
    expect(normalizeHackerNewsStory({
      id: 42,
      title: 'A technical story',
      url: 'https://example.org/story',
      score: 123,
      descendants: 45,
      time: 1_600_000_000,
    })).toMatchObject({
      id: 42,
      title: 'A technical story',
      source: 'example.org',
      points: 123,
      comments: 45,
      publishedAt: '2020-09-13T12:26:40.000Z',
    })
    expect(normalizeHackerNewsStory({ id: 43, title: 'Unsafe', url: 'javascript:alert(1)' })?.url).toBe('')
    expect(normalizeHackerNewsStory({ id: '43', title: 'Malformed' })).toBeNull()
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

  it('allows markup-looking text inside CDATA while still rejecting a real DTD', () => {
    const xml = `<rss version="2.0"><channel><title>GitHub Blog</title><item>
      <title>Example entry</title><link>https://github.blog/example/</link>
      <content:encoded><![CDATA[<!DOCTYPE html><html><body>Article body</body></html>]]></content:encoded>
      <pubDate>Mon, 21 Sep 2026 12:00:00 GMT</pubDate>
    </item></channel></rss>`

    expect(parseFeedXml(xml, 'https://github.blog/feed/').articles[0]?.title).toBe('Example entry')
    expect(() => parseFeedXml('<!DOCTYPE rss [<!ENTITY x "y">]><rss/>', 'https://example.org/feed.xml')).toThrow('Unsupported XML document')
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

  it('tries larger YouTube thumbnail variants before falling back to smaller ones', () => {
    expect(youtubeThumbnailCandidates('dQw4w9WgXcQ')).toEqual([
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/sddefault.jpg',
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg',
    ])
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
