import { parseFeedXml } from '../../shared/utils/feed'
import { normalizeFeedUrl } from '../../shared/utils/feedUrl'

const MAX_REDIRECTS = 4
const MAX_FEED_BYTES = 2 * 1024 * 1024
const FETCH_TIMEOUT_MS = 12_000
const ACCEPTED_FEED_TYPES = 'application/atom+xml, application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5'

function textDecoderFor(response: Response, initialBytes: Uint8Array): TextDecoder {
  const contentTypeCharset = response.headers.get('content-type')?.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1]
  const declaration = new TextDecoder('ascii').decode(initialBytes).match(/<\?xml[^>]*encoding\s*=\s*["']([^"']+)["']/i)?.[1]
  try { return new TextDecoder(contentTypeCharset || declaration || 'utf-8') } catch { return new TextDecoder() }
}

async function readFeedText(response: Response): Promise<string> {
  const statedSize = Number(response.headers.get('content-length'))
  if (Number.isFinite(statedSize) && statedSize > MAX_FEED_BYTES) throw new Error('Feed exceeds size limit')
  if (!response.body) throw new Error('Feed response has no body')

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > MAX_FEED_BYTES) {
        await reader.cancel()
        throw new Error('Feed exceeds size limit')
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
  return textDecoderFor(response, bytes.subarray(0, 256)).decode(bytes)
}

export async function fetchPublicFeed(input: string) {
  let url = normalizeFeedUrl(input)
  if (!url) throw new Error('Invalid or non-public feed URL')

  const visited = new Set<string>()
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS)
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    if (visited.has(url.href)) throw new Error('Feed redirect loop')
    visited.add(url.href)

    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal,
      headers: {
        Accept: ACCEPTED_FEED_TYPES,
        'User-Agent': 'Le Lac RSS reader',
      },
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      await response.body?.cancel()
      if (!location || redirects === MAX_REDIRECTS) throw new Error('Feed redirect limit reached')
      const destination = normalizeFeedUrl(new URL(location, url).href)
      if (!destination) throw new Error('Feed redirect destination is not public HTTPS')
      url = destination
      continue
    }

    if (!response.ok) {
      await response.body?.cancel()
      throw new Error(`Feed responded with status ${response.status}`)
    }

    return parseFeedXml(await readFeedText(response), url.href)
  }

  throw new Error('Feed redirect limit reached')
}
