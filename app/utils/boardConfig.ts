import { normalizeFeedUrl } from '~~/shared/utils/feedUrl'
import { normalizeYoutubeChannelId } from '~~/shared/utils/youtubeFeed'
import { cinemaLocationFromLegacyArea, isCinemaLocation, type CinemaLocation, type LegacyCinemaAreaId } from '~~/shared/utils/cinema'

export type WidgetKind = 'rss' | 'weather' | 'clock' | 'youtube' | 'github-trending' | 'github-developers-trending' | 'hacker-news' | 'openrouter-models' | 'cinema' | 'cinema-releases' | 'netflix-releases' | 'apple-tv-releases' | 'prime-video-releases'
export type GitHubTrendingPeriod = 'daily' | 'weekly' | 'monthly'
export interface City { name: string; timezone: string }
export type DashboardId = 'daily' | 'tech' | 'cinema'
export interface BoardWidget {
  id: string
  type: WidgetKind
  title: string
  x: number
  y: number
  w: number
  h: number
  feedUrl?: string
  channelId?: string
  grayscale?: boolean
  githubPeriod?: GitHubTrendingPeriod
  githubLanguage?: string
  location?: { name: string; lat: number; lon: number }
  cities?: City[]
  cinemaLocation?: CinemaLocation
  /** @deprecated Read only: migrated to cinemaLocation by parseBoard. */
  cinemaArea?: LegacyCinemaAreaId
}
export interface BoardConfig { version: 1; widgets: BoardWidget[] }
export const boardStorageKey = 'encascade:board:v1'
export function dashboardStorageKey(id: DashboardId) {
  return id === 'daily' ? boardStorageKey : `${boardStorageKey}:${id}`
}
export function widgetDefaults(type: WidgetKind, id: string): BoardWidget {
  const base = { id, type, x: 0, y: 0, w: 4, h: 5 }
  if (type === 'rss') return { ...base, title: 'The Conversation · À la une', w: 8, h: 9, feedUrl: 'https://theconversation.com/us/articles.atom' }
  if (type === 'weather') return { ...base, title: 'Météo', location: { name: 'Paris, France', lat: 48.8566, lon: 2.3522 } }
  if (type === 'youtube') return { ...base, title: 'Vidéos YouTube', w: 8, h: 6, channelId: '', grayscale: false }
  if (type === 'github-trending') return { ...base, title: 'Dépôts GitHub tendance', w: 8, h: 8, githubPeriod: 'daily', githubLanguage: '' }
  if (type === 'github-developers-trending') return { ...base, title: 'Développeurs GitHub tendance', w: 8, h: 8, githubPeriod: 'daily', githubLanguage: '' }
  if (type === 'hacker-news') return { ...base, title: 'Hacker News', w: 8, h: 8 }
  if (type === 'openrouter-models') return { ...base, title: 'Modèles d’IA récents', w: 8, h: 8 }
  if (type === 'cinema') return { ...base, title: 'Séances de cinéma', w: 12, h: 9, cinemaLocation: cinemaLocationFromLegacyArea('versailles')! }
  if (type === 'cinema-releases') return { ...base, title: 'Programmation à venir', w: 8, h: 8 }
  if (type === 'netflix-releases') return { ...base, title: 'Sorties Netflix', w: 12, h: 8 }
  if (type === 'apple-tv-releases') return { ...base, title: 'Sorties Apple TV', w: 12, h: 8 }
  if (type === 'prime-video-releases') return { ...base, title: 'Sorties Prime Video', w: 12, h: 8 }
  return { ...base, title: 'Heures du monde', cities: [{ name: 'Paris', timezone: 'Europe/Paris' }, { name: 'New York', timezone: 'America/New_York' }, { name: 'Tokyo', timezone: 'Asia/Tokyo' }] }
}
export function defaultBoard(): BoardConfig {
  return { version: 1, widgets: [widgetDefaults('rss', 'news'), { ...widgetDefaults('weather', 'weather'), x: 8 }, { ...widgetDefaults('clock', 'clock'), x: 8, y: 5 }] }
}
export function defaultDashboard(id: DashboardId): BoardConfig {
  if (id === 'daily') return defaultBoard()
  if (id === 'cinema') return {
    version: 1,
    widgets: [
      widgetDefaults('cinema', 'cinema-programme'),
      {
        ...widgetDefaults('youtube', 'cinema-trailers'),
        title: 'Bandes-annonces · FilmsActu',
        channelId: 'UC_i8X3p8oZNaik8X513Zn1Q',
        x: 0,
        y: 9,
        w: 12,
        h: 8,
      },
      { ...widgetDefaults('netflix-releases', 'netflix-releases'), y: 17 },
      { ...widgetDefaults('apple-tv-releases', 'apple-tv-releases'), y: 25 },
      { ...widgetDefaults('prime-video-releases', 'prime-video-releases'), y: 33 },
    ],
  }
  return {
    version: 1,
    widgets: [
      {
        ...widgetDefaults('youtube', 'google-developers'),
        title: 'Google Developers',
        channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
        w: 12,
        h: 8,
      },
      {
        ...widgetDefaults('rss', 'github-blog'),
        title: 'GitHub Blog',
        feedUrl: 'https://github.blog/feed/',
        x: 0,
        y: 8,
        w: 6,
        h: 8,
      },
      {
        ...widgetDefaults('rss', 'cloudflare-workers-ai'),
        title: 'Cloudflare · Workers AI',
        feedUrl: 'https://developers.cloudflare.com/changelog/rss/workers-ai.xml',
        x: 6,
        y: 8,
        w: 6,
        h: 8,
      },
      {
        ...widgetDefaults('github-trending', 'github-trending-repositories'),
        x: 0,
        y: 16,
        w: 12,
        h: 8,
      },
      {
        ...widgetDefaults('github-developers-trending', 'github-trending-developers'),
        x: 0,
        y: 24,
        w: 12,
        h: 8,
      },
      {
        ...widgetDefaults('openrouter-models', 'openrouter-models'),
        x: 0,
        y: 32,
        w: 12,
        h: 8,
      },
    ],
  }
}

/** Upgrade only untouched Tech seeds from before the feed and trend defaults were added. */
export function upgradeDashboardDefaults(id: DashboardId, board: BoardConfig): BoardConfig {
  if (id === 'cinema') {
    const previousSeed = { version: 1, widgets: [widgetDefaults('cinema', 'cinema-programme')] }
    const previousSeedWithTrailers = defaultDashboard('cinema').widgets.slice(0, 2)
    const previousSeedWithNetflix = defaultDashboard('cinema').widgets.slice(0, 3)
    const previousSeedWithAppleTv = defaultDashboard('cinema').widgets.slice(0, 4)
    return JSON.stringify(board) === JSON.stringify(previousSeed)
      || JSON.stringify(board.widgets) === JSON.stringify(previousSeedWithTrailers)
      || JSON.stringify(board.widgets) === JSON.stringify(previousSeedWithNetflix)
      || JSON.stringify(board.widgets) === JSON.stringify(previousSeedWithAppleTv)
      ? defaultDashboard('cinema')
      : board
  }
  if (id !== 'tech') return board

  const defaults = defaultDashboard('tech')
  const currentSeed = defaults.widgets.slice(0, 4)
  const previousSeed = currentSeed.slice(0, 3)
  const previousFullSeed = defaults.widgets.filter(widget => widget.type !== 'openrouter-models')
  if (board.widgets.length === previousFullSeed.length && JSON.stringify(board.widgets) === JSON.stringify(previousFullSeed)) return defaults
  if (board.widgets.length === currentSeed.length && JSON.stringify(board.widgets) === JSON.stringify(currentSeed)) return defaultDashboard('tech')
  if (board.widgets.length === previousSeed.length && JSON.stringify(board.widgets) === JSON.stringify(previousSeed)) return defaultDashboard('tech')
  if (board.widgets.length !== 1) return board

  const [widget] = board.widgets
  if (!widget) return board
  const expected = {
    id: 'google-developers',
    type: 'youtube',
    title: 'Google Developers',
    x: 0,
    y: 0,
    w: 12,
    h: 8,
    channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
  }
  const allowedKeys = new Set([...Object.keys(expected), 'grayscale'])
  if (Object.keys(widget).some(key => !allowedKeys.has(key))) return board
  if (!Object.entries(expected).every(([key, value]) => widget[key as keyof BoardWidget] === value)) return board
  if (widget.grayscale !== undefined && widget.grayscale !== false) return board

  return defaultDashboard('tech')
}
export function validTimezone(value: string) {
  try { new Intl.DateTimeFormat('fr-FR', { timeZone: value }).format(); return !!value } catch { return false }
}
export function validFeedUrl(value: string) {
  return normalizeFeedUrl(value) !== null
}
export function parseBoard(value: unknown): BoardConfig | null {
  if (!value || typeof value !== 'object') return null
  const config = JSON.parse(JSON.stringify(value)) as BoardConfig
  if (config.version !== 1 || !Array.isArray(config.widgets)) return null
  // Retire proprement les anciens widgets d’événements sans invalider le reste du tableau.
  config.widgets = config.widgets.filter(widget => !widget || typeof widget !== 'object' || (widget as { type?: unknown }).type !== 'cinema-events')
  if (config.widgets.length > 24) return null
  const ids = new Set<string>()
  for (const p of config.widgets) {
    if (!p || typeof p.id !== 'string' || !p.id || ids.has(p.id) || typeof p.title !== 'string' || !p.title.trim() || p.title.length > 100) return null
    ids.add(p.id)
    if (![p.x, p.y, p.w, p.h].every(Number.isSafeInteger) || p.x < 0 || p.y < 0 || p.y > 1000 || p.w < 3 || p.x + p.w > 12 || p.h < 4 || p.h > 16) return null
    if (p.type === 'rss') { if (typeof p.feedUrl !== 'string' || !validFeedUrl(p.feedUrl)) return null }
    else if (p.type === 'youtube') { if (typeof p.channelId !== 'string' || normalizeYoutubeChannelId(p.channelId) !== p.channelId || (p.grayscale !== undefined && typeof p.grayscale !== 'boolean')) return null }
    else if (p.type === 'github-trending' || p.type === 'github-developers-trending') {
      if (p.githubPeriod !== 'daily' && p.githubPeriod !== 'weekly' && p.githubPeriod !== 'monthly') return null
      if (typeof p.githubLanguage !== 'string' || p.githubLanguage.length > 50 || /[\u0000-\u001f]/.test(p.githubLanguage)) return null
    }
    else if (p.type === 'hacker-news' || p.type === 'openrouter-models') {
      // These source widgets have no per-widget settings in the prototype.
    }
    else if (p.type === 'cinema') {
      if (p.cinemaLocation !== undefined) {
        if (!isCinemaLocation(p.cinemaLocation)) return null
      } else {
        const migratedLocation = cinemaLocationFromLegacyArea(p.cinemaArea)
        if (!migratedLocation) return null
        p.cinemaLocation = migratedLocation
      }
      delete p.cinemaArea
    }
    else if (p.type === 'cinema-releases') {
      // National listing based on the first upcoming screening recorded by the SCARE network.
    }
    else if (p.type === 'netflix-releases') {
      // Public, non-exhaustive release dates announced by Netflix France.
    }
    else if (p.type === 'apple-tv-releases') {
      // Dated upcoming Apple Originals listed by Apple TV Press France.
    }
    else if (p.type === 'prime-video-releases') {
      // Dated release calendar entries listed for France by Prime Video.
    }
    else if (p.type === 'weather') {
      const l = p.location
      if (!l || typeof l.name !== 'string' || !l.name.trim() || !Number.isFinite(l.lat) || !Number.isFinite(l.lon) || Math.abs(l.lat) > 90 || Math.abs(l.lon) > 180) return null
    } else if (p.type === 'clock') {
      if (!Array.isArray(p.cities) || !p.cities.length || p.cities.length > 3 || p.cities.some(c => !c || typeof c.name !== 'string' || !c.name.trim() || typeof c.timezone !== 'string' || !validTimezone(c.timezone))) return null
    } else return null
  }
  for (let a = 0; a < config.widgets.length; a++) for (let b = a + 1; b < config.widgets.length; b++) {
    const p = config.widgets[a]!, q = config.widgets[b]!
    if (p.x < q.x + q.w && p.x + p.w > q.x && p.y < q.y + q.h && p.y + p.h > q.y) return null
  }
  return config
}
