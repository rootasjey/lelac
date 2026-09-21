import { normalizeFeedUrl } from '~~/shared/utils/feedUrl'
import { normalizeYoutubeChannelId } from '~~/shared/utils/youtubeFeed'

export type WidgetKind = 'rss' | 'weather' | 'clock' | 'youtube'
export interface City { name: string; timezone: string }
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
  location?: { name: string; lat: number; lon: number }
  cities?: City[]
}
export interface BoardConfig { version: 1; widgets: BoardWidget[] }
export const boardStorageKey = 'encascade:board:v1'
export function widgetDefaults(type: WidgetKind, id: string): BoardWidget {
  const base = { id, type, x: 0, y: 0, w: 4, h: 5 }
  if (type === 'rss') return { ...base, title: 'The Conversation · À la une', w: 8, h: 9, feedUrl: 'https://theconversation.com/us/articles.atom' }
  if (type === 'weather') return { ...base, title: 'Météo', location: { name: 'Paris, France', lat: 48.8566, lon: 2.3522 } }
  if (type === 'youtube') return { ...base, title: 'Vidéos YouTube', w: 8, h: 6, channelId: '', grayscale: false }
  return { ...base, title: 'Heures du monde', cities: [{ name: 'Paris', timezone: 'Europe/Paris' }, { name: 'New York', timezone: 'America/New_York' }, { name: 'Tokyo', timezone: 'Asia/Tokyo' }] }
}
export function defaultBoard(): BoardConfig {
  return { version: 1, widgets: [widgetDefaults('rss', 'news'), { ...widgetDefaults('weather', 'weather'), x: 8 }, { ...widgetDefaults('clock', 'clock'), x: 8, y: 5 }] }
}
export function validTimezone(value: string) {
  try { new Intl.DateTimeFormat('fr-FR', { timeZone: value }).format(); return !!value } catch { return false }
}
export function validFeedUrl(value: string) {
  return normalizeFeedUrl(value) !== null
}
export function parseBoard(value: unknown): BoardConfig | null {
  if (!value || typeof value !== 'object') return null
  const config = value as BoardConfig
  if (config.version !== 1 || !Array.isArray(config.widgets) || config.widgets.length > 24) return null
  const ids = new Set<string>()
  for (const p of config.widgets) {
    if (!p || typeof p.id !== 'string' || !p.id || ids.has(p.id) || typeof p.title !== 'string' || !p.title.trim() || p.title.length > 100) return null
    ids.add(p.id)
    if (![p.x, p.y, p.w, p.h].every(Number.isSafeInteger) || p.x < 0 || p.y < 0 || p.y > 1000 || p.w < 3 || p.x + p.w > 12 || p.h < 4 || p.h > 16) return null
    if (p.type === 'rss') { if (typeof p.feedUrl !== 'string' || !validFeedUrl(p.feedUrl)) return null }
    else if (p.type === 'youtube') { if (typeof p.channelId !== 'string' || normalizeYoutubeChannelId(p.channelId) !== p.channelId || (p.grayscale !== undefined && typeof p.grayscale !== 'boolean')) return null }
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
  return JSON.parse(JSON.stringify(config))
}
