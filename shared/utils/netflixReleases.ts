export interface NetflixRelease {
  key: string
  title: string
  kind: string
  dateLabel: string
  dateSortKey: string
  url: string
  imageUrl?: string
}

export interface NetflixReleasesResult {
  releases: NetflixRelease[]
  total: number
  fetchedAt: string
  sourceUrl: string
}

const MONTHS: Record<string, number> = {
  JANVIER: 1, FEVRIER: 2, MARS: 3, AVRIL: 4, MAI: 5, JUIN: 6,
  JUILLET: 7, AOUT: 8, SEPTEMBRE: 9, OCTOBRE: 10, NOVEMBRE: 11, DECEMBRE: 12,
}
const KINDS = new Set(['FILM', 'SERIE', 'SÉRIE', 'DOCUMENTAIRE', 'COMPETITION', 'COMPÉTITION', 'ANIMATION', 'EVENEMENT', 'ÉVÉNEMENT'])
const SEASONS: Record<string, number> = { PRINTEMPS: 3, ETE: 6, AUTOMNE: 10, HIVER: 12 }

function plainText(value: string): string {
  return value
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;|&#xA0;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&#x0*27;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalized(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleUpperCase('fr')
}

function dateSortKey(value: string): { label: string; sortKey: string } | null {
  const text = normalized(value).replace(/\.$/, '').trim()
  const months = Object.keys(MONTHS).join('|')
  const dayMatch = text.match(new RegExp(`\\b(\\d{1,2})(?:ER)?\\s+(${months})\\s+(20\\d{2})\\b`))
  if (dayMatch) {
    const month = MONTHS[dayMatch[2]!]
    const day = Number(dayMatch[1])
    const year = Number(dayMatch[3])
    if (month && day >= 1 && day <= 31) return { label: value.trim(), sortKey: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` }
  }

  const seasonMatch = text.match(/\b(PRINTEMPS|ETE|AUTOMNE|HIVER)\s+(20\d{2})\b/)
  if (seasonMatch) {
    const month = SEASONS[seasonMatch[1]!]!
    return { label: value.trim(), sortKey: `${seasonMatch[2]}-${String(month).padStart(2, '0')}-01` }
  }

  const monthMatch = text.match(new RegExp(`\\b(${months})\\s+(20\\d{2})\\b`))
  if (monthMatch) {
    const month = MONTHS[monthMatch[1]!]!
    return { label: value.trim(), sortKey: `${monthMatch[2]}-${String(month).padStart(2, '0')}-01` }
  }

  const yearMatch = text.match(/\b(20\d{2})\b/)
  if (yearMatch) return { label: value.trim(), sortKey: `${yearMatch[1]}-01-01` }
  return null
}

function parseHeading(headingHtml: string): NetflixRelease | null {
  const anchor = headingHtml.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i)
  if (!anchor) return null

  const title = plainText(anchor[2] ?? '')
  const rest = plainText(headingHtml.replace(anchor[0], '')).replace(/^[-–—]\s*/, '')
  if (!title || !rest) return null
  const parts = rest.split(/\s+-\s+/).map(part => part.trim()).filter(Boolean)
  const dateIndex = parts.findIndex(part => dateSortKey(part) !== null)
  if (dateIndex < 0) return null
  const parsedDate = dateSortKey(parts[dateIndex]!)
  if (!parsedDate) return null
  const kind = parts.find((part, index) => index !== dateIndex && KINDS.has(normalized(part))) ?? 'Programme'
  const source = new URL(anchor[1]!, 'https://about.netflix.com')
  const titleId = source.pathname.match(/^\/[^/]+\/only-on-netflix\/(\d+)\/?$/)?.[1]
  if (source.protocol !== 'https:' || source.hostname !== 'media.netflix.com' || !titleId) return null
  const url = `https://www.netflix.com/fr/title/${titleId}`

  return {
    key: titleId,
    title,
    kind,
    dateLabel: parsedDate.label,
    dateSortKey: parsedDate.sortKey,
    url,
  }
}

/** Extracts the dated titles from Netflix's public France release-calendar article. */
export function parseNetflixReleaseCalendar(html: string, today = new Date()): NetflixRelease[] {
  const todayKey = today.toISOString().slice(0, 10)
  const releases: NetflixRelease[] = []
  for (const match of html.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)) {
    const headingHtml = match[1] ?? ''
    const headingText = normalized(plainText(headingHtml))
    if (headingText.startsWith('EN PRODUCTION') || headingText.startsWith('PRODUCTION EN COURS')) break
    const release = parseHeading(headingHtml)
    if (release && release.dateSortKey >= todayKey) releases.push(release)
  }

  return releases.sort((a, b) => a.dateSortKey.localeCompare(b.dateSortKey) || a.title.localeCompare(b.title, 'fr'))
}

/** Extract the public artwork URL from a Netflix title page, never arbitrary remote hosts. */
export function parseNetflixTitleArtwork(html: string): string | undefined {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0] ?? ''
    const attribute = (name: string) => tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2]
    const property = (attribute('property') ?? attribute('name') ?? '').toLowerCase()
    if (property !== 'og:image' && property !== 'twitter:image') continue
    const content = attribute('content')
      ?.replace(/&amp;/gi, '&')
      .replace(/&#0*39;|&#x0*27;|&apos;/gi, "'")
      .trim()
    if (!content) continue

    try {
      const image = new URL(content, 'https://www.netflix.com')
      if (image.protocol === 'https:' && image.hostname.endsWith('.nflxso.net')) return image.toString()
    }
    catch {
      // Ignore malformed artwork links and keep the title usable without an image.
    }
  }
  return undefined
}
