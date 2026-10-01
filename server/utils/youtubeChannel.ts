import { youtubeChannelHandleFromInput } from '../../shared/utils/youtubeFeed'
import { resolveYoutubeChannelIdByHandle } from './youtubeDataApi'

const CHANNEL_ID_PATTERN = /^UC[A-Za-z0-9_-]{22}$/
const CHANNEL_ID_SOURCE = '(UC[A-Za-z0-9_-]{22})'
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com'])
const MAX_REDIRECTS = 3
const MAX_HTML_BYTES = 4 * 1024 * 1024
const FETCH_TIMEOUT_MS = 10_000

function attribute(tag: string, name: string): string | null {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2] ?? null
}

export function youtubeChannelIdFromHtml(html: string): string | null {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? []
  for (const tag of metaTags) {
    if (attribute(tag, 'itemprop')?.toLowerCase() !== 'channelid') continue
    const id = attribute(tag, 'content')
    if (id && CHANNEL_ID_PATTERN.test(id)) return id
  }

  const canonicalLinks = html.match(/<link\b[^>]*>/gi) ?? []
  for (const tag of canonicalLinks) {
    if (!attribute(tag, 'rel')?.toLowerCase().split(/\s+/).includes('canonical')) continue
    const href = attribute(tag, 'href')
    if (!href) continue
    try {
      const id = new URL(href, 'https://www.youtube.com').pathname.match(/^\/channel\/(UC[A-Za-z0-9_-]{22})(?:\/|$)/)?.[1]
      if (id) return id
    } catch { /* Ignore malformed canonical metadata and inspect the embedded data. */ }
  }

  for (const key of ['externalId', 'browseId', 'channelId']) {
    const id = html.match(new RegExp(`"${key}"\\s*:\\s*"${CHANNEL_ID_SOURCE}"`))?.[1]
    if (id) return id
  }

  return null
}

async function readHtml(response: Response): Promise<string> {
  const statedSize = Number(response.headers.get('content-length'))
  if (Number.isFinite(statedSize) && statedSize > MAX_HTML_BYTES) throw new Error('YouTube channel page exceeds size limit')
  if (!response.body) throw new Error('YouTube channel page has no body')

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > MAX_HTML_BYTES) {
        await reader.cancel()
        throw new Error('YouTube channel page exceeds size limit')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

function normalizeYoutubePageUrl(input: string): URL | null {
  try {
    const url = new URL(input)
    if (url.protocol !== 'https:' || !YOUTUBE_HOSTS.has(url.hostname.toLowerCase()) || url.username || url.password || url.port) return null
    return url
  } catch {
    return null
  }
}

export async function resolveYoutubeChannelId(input: string, apiKey?: string): Promise<string> {
  const handle = youtubeChannelHandleFromInput(input)
  if (!handle) throw new Error('Invalid YouTube channel handle')

  if (apiKey?.trim()) {
    try {
      const channelId = await resolveYoutubeChannelIdByHandle(handle, apiKey.trim())
      if (channelId) return channelId
    } catch { /* YouTube's page resolver remains available when the Data API cannot resolve a handle. */ }
  }

  let url = new URL(`/@${handle}`, 'https://www.youtube.com')
  const visited = new Set<string>()
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS)

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    if (visited.has(url.href)) throw new Error('YouTube channel page redirect loop')
    visited.add(url.href)

    const response = await fetch(url, {
      redirect: 'manual',
      signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'User-Agent': 'Trame channel resolver',
      },
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      await response.body?.cancel()
      if (!location || redirects === MAX_REDIRECTS) throw new Error('YouTube channel page redirect limit reached')
      const destination = normalizeYoutubePageUrl(new URL(location, url).href)
      if (!destination) throw new Error('YouTube channel page redirected outside YouTube')
      url = destination
      continue
    }

    if (!response.ok) {
      await response.body?.cancel()
      throw new Error(`YouTube channel page responded with status ${response.status}`)
    }

    const channelId = youtubeChannelIdFromHtml(await readHtml(response))
    if (!channelId) throw new Error('YouTube channel ID was not present in the page')
    return channelId
  }

  throw new Error('YouTube channel page redirect limit reached')
}
