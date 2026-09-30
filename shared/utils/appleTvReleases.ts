export interface AppleTvRelease {
  key: string
  title: string
  kind: string
  dateLabel: string
  dateSortKey: string
  url: string
  imageUrl?: string
}

export interface AppleTvReleasesResult {
  releases: AppleTvRelease[]
  total: number
  fetchedAt: string
  sourceUrl: string
}

interface AppleTvOriginal {
  title?: unknown
  url?: unknown
  showType?: unknown
  showTypeKey?: unknown
  releaseDateDisplayString?: unknown
  releaseDateISOString?: unknown
  image?: {
    name?: unknown
    type?: unknown
    dirpath?: unknown
  }
}

function appleUrl(value: string): URL | undefined {
  try {
    const url = new URL(value, 'https://www.apple.com')
    if (url.protocol !== 'https:' || (url.hostname !== 'apple.com' && !url.hostname.endsWith('.apple.com'))) return undefined
    return url
  }
  catch {
    return undefined
  }
}

function parseOriginal(value: unknown, todayKey: string): AppleTvRelease | null {
  if (!value || typeof value !== 'object') return null
  const original = value as AppleTvOriginal
  if (typeof original.title !== 'string' || !original.title.trim()) return null
  if (typeof original.url !== 'string') return null

  const url = appleUrl(original.url)
  if (!url || !/^\/(?:fr\/)?tv-pr\/originals\/[a-z0-9-]+\/?$/i.test(url.pathname)) return null

  if (typeof original.releaseDateISOString !== 'string' || !/^20\d{2}-\d{2}-\d{2}T/.test(original.releaseDateISOString)) return null
  const date = new Date(original.releaseDateISOString)
  if (!Number.isFinite(date.getTime())) return null
  const dateSortKey = date.toISOString().slice(0, 10)
  if (dateSortKey < todayKey) return null

  const dateLabel = typeof original.releaseDateDisplayString === 'string' && original.releaseDateDisplayString.trim()
    ? original.releaseDateDisplayString.trim()
    : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const showType = typeof original.showType === 'string' ? original.showType : ''
  const showTypeKey = typeof original.showTypeKey === 'string' ? original.showTypeKey : ''
  const kind = showTypeKey === 'films' || showType.toLocaleLowerCase('fr') === 'films'
    ? 'Film'
    : showTypeKey === 'series' || showType.toLocaleLowerCase('fr') === 'séries'
      ? 'Série'
      : 'Apple Original'

  let imageUrl: string | undefined
  const image = original.image
  if (image && typeof image.dirpath === 'string' && typeof image.name === 'string' && typeof image.type === 'string') {
    const candidate = appleUrl(`${image.dirpath}${image.name}.large.${image.type}`)
    if (candidate && /^\/(?:fr\/)?tv-pr\/shows-and-films\//i.test(candidate.pathname)) imageUrl = candidate.toString()
  }

  const key = url.pathname.split('/').filter(Boolean).at(-1)
  if (!key) return null
  return {
    key,
    title: original.title.trim(),
    kind,
    dateLabel,
    dateSortKey,
    url: url.toString(),
    ...(imageUrl ? { imageUrl } : {}),
  }
}

/** Extracts upcoming dated titles and artwork from Apple TV Press's public French JSON catalogue. */
export function parseAppleTvReleaseCalendar(payload: unknown, today = new Date()): AppleTvRelease[] {
  if (!payload || typeof payload !== 'object') return []
  const results = (payload as { results?: unknown }).results
  if (!results || typeof results !== 'object') return []
  const originals = (results as { originals?: unknown }).originals
  if (!Array.isArray(originals)) return []

  const todayKey = today.toISOString().slice(0, 10)
  const releases = new Map<string, AppleTvRelease>()
  for (const original of originals) {
    const release = parseOriginal(original, todayKey)
    if (release) releases.set(release.key, release)
  }

  return [...releases.values()].sort((a, b) => a.dateSortKey.localeCompare(b.dateSortKey) || a.title.localeCompare(b.title, 'fr'))
}
