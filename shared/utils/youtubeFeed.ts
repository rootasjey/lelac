const CHANNEL_ID_PATTERN = /^UC[A-Za-z0-9_-]{22}$/
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com'])
const VIDEO_HOSTS = new Set([...YOUTUBE_HOSTS, 'youtu.be', 'www.youtu.be'])

export function normalizeYoutubeChannelId(input: string): string | null {
  const value = input.trim()
  if (CHANNEL_ID_PATTERN.test(value)) return value

  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null

    const id = url.searchParams.get('channel_id')
      ?? url.pathname.match(/^\/channel\/(UC[A-Za-z0-9_-]{22})(?:\/|$)/)?.[1]
    return id && CHANNEL_ID_PATTERN.test(id) ? id : null
  } catch {
    return null
  }
}

export function youtubeChannelHandleFromInput(input: string): string | null {
  const value = input.trim()
  const candidate = value.startsWith('@') ? `https://www.youtube.com/${value}` : value

  try {
    const url = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`)
    if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null

    const encodedHandle = url.pathname.match(/^\/@([^/]+)(?:\/|$)/)?.[1]
    if (!encodedHandle) return null
    const handle = decodeURIComponent(encodedHandle)
    return /^[\p{L}\p{N}._-]{3,30}$/u.test(handle) ? handle : null
  } catch {
    return null
  }
}

export function youtubeFeedUrl(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`
}

export function youtubeVideoIdFromUrl(input: string): string | null {
  try {
    const url = new URL(input)
    const hostname = url.hostname.toLowerCase()
    if (!VIDEO_HOSTS.has(hostname)) return null

    const candidate = hostname === 'youtu.be' || hostname === 'www.youtu.be'
      ? url.pathname.split('/').filter(Boolean)[0]
      : url.pathname === '/watch'
        ? url.searchParams.get('v')
        : url.pathname.match(/^\/(?:embed|live|shorts)\/([^/]+)/)?.[1]

    return candidate && VIDEO_ID_PATTERN.test(candidate) ? candidate : null
  } catch {
    return null
  }
}

export function youtubeThumbnailCandidates(videoId: string): string[] {
  const encodedId = encodeURIComponent(videoId)
  return ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default']
    .map(size => `https://i.ytimg.com/vi/${encodedId}/${size}.jpg`)
}

export function youtubePublishedDateLabel(input: string, now = Date.now()): string {
  const publishedAt = new Date(input)
  if (!Number.isFinite(publishedAt.getTime())) return ''

  const dayInMs = 24 * 60 * 60 * 1000
  const ageInMs = now - publishedAt.getTime()
  if (ageInMs < 0 || ageInMs >= 7 * dayInMs) {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(publishedAt)
  }

  const relativeDate = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' })
  const days = Math.floor(ageInMs / dayInMs)
  if (days > 0) return relativeDate.format(-days, 'day')

  const hours = Math.floor(ageInMs / (60 * 60 * 1000))
  if (hours > 0) return relativeDate.format(-hours, 'hour')

  const minutes = Math.floor(ageInMs / (60 * 1000))
  if (minutes > 0) return relativeDate.format(-minutes, 'minute')

  return 'À l’instant'
}
