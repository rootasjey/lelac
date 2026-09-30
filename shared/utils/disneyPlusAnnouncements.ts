export interface DisneyPlusAnnouncement {
  key: string
  title: string
  description?: string
  kind: 'Film' | 'Série'
  dateLabel: string
  dateSortKey: string
  publishedAt: string
  url: string
  imageUrl?: string
}

export interface DisneyPlusAnnouncementsResult {
  announcements: DisneyPlusAnnouncement[]
  total: number
  fetchedAt: string
  sourceUrl: string
}

interface NewsCard {
  title: string
  publishedAt: string
  url: string
  imageUrl?: string
  kind: 'Film' | 'Série'
}

const SOURCE_HOST = 'newsroom.disney.fr'
const IMAGE_HOST = 'storage.googleapis.com'
const MONTHS: Record<string, number> = {
  JANVIER: 1, FEVRIER: 2, MARS: 3, AVRIL: 4, MAI: 5, JUIN: 6,
  JUILLET: 7, AOUT: 8, SEPTEMBRE: 9, OCTOBRE: 10, NOVEMBRE: 11, DECEMBRE: 12,
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;|&#160;|&#xA0;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&#x0*27;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
}

function textContent(value: string): string {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function attribute(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))
  return match?.[2] ? decodeHtml(match[2]).trim() : undefined
}

function safeArticleUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value, `https://${SOURCE_HOST}`)
    if (url.protocol !== 'https:' || url.hostname !== SOURCE_HOST || !url.pathname.startsWith('/actualites/')) return undefined
    return url.toString()
  }
  catch {
    return undefined
  }
}

function safeImageUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value, `https://${SOURCE_HOST}`)
    if (url.protocol !== 'https:' || url.hostname !== IMAGE_HOST || !url.pathname.startsWith('/endurance-apps-liip/media/cache/disney_publication_card_grid_fs/')) return undefined
    return url.toString()
  }
  catch {
    return undefined
  }
}

function matchingDivEnd(html: string, openTagEnd: number): number | undefined {
  const tags = /<\/?div\b[^>]*>/gi
  let depth = 1
  for (const match of html.slice(openTagEnd).matchAll(tags)) {
    const tag = match[0] ?? ''
    if (/^<\//.test(tag)) depth--
    else if (!/\/\s*>$/.test(tag)) depth++
    if (!depth) return openTagEnd + (match.index ?? 0) + tag.length
  }
  return undefined
}

function extractCards(html: string): string[] {
  const cards: string[] = []
  const openingTags = /<div\b[^>]*\bclass\s*=\s*(["'])[^"']*\bcard--topic\b[^"']*\1[^>]*>/gi
  for (const match of html.matchAll(openingTags)) {
    const open = match[0] ?? ''
    const start = (match.index ?? 0) + open.length
    const end = matchingDivEnd(html, start)
    if (end) cards.push(html.slice(start, end))
  }
  return cards
}

function parsePublishedDate(value: string): Date | undefined {
  const match = value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleUpperCase('fr').match(/\b(\d{1,2})\s+(JANVIER|FEVRIER|MARS|AVRIL|MAI|JUIN|JUILLET|AOUT|SEPTEMBRE|OCTOBRE|NOVEMBRE|DECEMBRE)\s+(20\d{2})\b/)
  if (!match) return undefined
  const month = MONTHS[match[2]!]
  if (!month) return undefined
  const date = new Date(Date.UTC(Number(match[3]), month - 1, Number(match[1]), 12))
  return Number.isFinite(date.getTime()) ? date : undefined
}

function releaseDateFromTitle(title: string, publishedAt: Date, today: Date): { label: string; sortKey: string } | undefined {
  const normalized = title.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleUpperCase('fr')
  const monthNames = Object.keys(MONTHS).join('|')
  const match = normalized.match(new RegExp(`\\b(?:LE|DES LE|A PARTIR DU|DISPONIBLE LE|LANCEE LE|LANCEMENT LE)?\\s*(\\d{1,2})(?:ER)?\\s+(${monthNames})\\b`))
  if (!match) return undefined
  const month = MONTHS[match[2]!]
  const day = Number(match[1])
  if (!month || day < 1 || day > 31) return undefined

  let year = publishedAt.getUTCFullYear()
  let release = new Date(Date.UTC(year, month - 1, day, 12))
  if (release.getUTCMonth() !== month - 1 || release.getUTCDate() !== day) return undefined

  // If the announced date is only a few months before the article, it has passed;
  // if it is farther back in the year, treat it as a next-year announcement.
  if (release < publishedAt) {
    const daysSinceRelease = (publishedAt.getTime() - release.getTime()) / 86_400_000
    if (daysSinceRelease <= 180) return undefined
    year++
    release = new Date(Date.UTC(year, month - 1, day, 12))
  }

  if (release < new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))) return undefined
  const dateSortKey = release.toISOString().slice(0, 10)
  const dateLabel = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(release)
  return { label: dateLabel, sortKey: dateSortKey }
}

function parseCard(card: string): NewsCard | undefined {
  const imageTag = card.match(/<img\b[^>]*>/i)?.[0]
  const imageUrl = safeImageUrl(attribute(imageTag ?? '', 'src'))
  const heading = card.match(/<h3\b[^>]*class\s*=\s*(["'])[^"']*\bcard-title\b[^"']*\1[^>]*>([\s\S]*?)<\/h3>/i)?.[2]
  const anchor = heading?.match(/<a\b[^>]*>/i)?.[0]
  const url = safeArticleUrl(attribute(anchor ?? '', 'href'))
  const title = textContent(heading ?? '')
  const dateNode = card.match(/<span\b[^>]*class\s*=\s*(["'])[^"']*\bcard-subtitle-date\b[^"']*\1[^>]*>([\s\S]*?)<\/span>/i)?.[2]
  const publishedAt = parsePublishedDate(textContent(dateNode ?? ''))
  if (!url || !title || !publishedAt) return undefined
  const tags = [...card.matchAll(/<a\b[^>]*class\s*=\s*(["'])[^"']*\blabel--tags\b[^"']*\1[^>]*>([\s\S]*?)<\/a>/gi)]
    .map(match => textContent(match[2] ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('fr'))
  const kind: NewsCard['kind'] = tags.includes('films')
    ? 'Film'
    : tags.includes('series')
      ? 'Série'
      : /\bfilm\b/i.test(title) ? 'Film' : 'Série'
  return { title, publishedAt: publishedAt.toISOString(), url, kind, ...(imageUrl ? { imageUrl } : {}) }
}

/** Reads dated release announcements from Disney France's official tagged-news page. */
export function parseDisneyPlusAnnouncements(html: string, today = new Date()): DisneyPlusAnnouncement[] {
  const todayKey = today.toISOString().slice(0, 10)
  const oldestAcceptedPublication = today.getTime() - 120 * 86_400_000
  const results = new Map<string, DisneyPlusAnnouncement>()
  for (const cardHtml of extractCards(html)) {
    const card = parseCard(cardHtml)
    if (!card || new Date(card.publishedAt).getTime() < oldestAcceptedPublication) continue
    const releaseDate = releaseDateFromTitle(card.title, new Date(card.publishedAt), today)
    if (!releaseDate || releaseDate.sortKey < todayKey) continue
    const key = card.url.split('/').at(-1)?.replace(/\.html$/, '')
    if (!key) continue
    results.set(key, {
      key,
      title: card.title.split(/\s+(?:\||I)\s+/).at(0)?.replace(/^[\s«»“”"'’]+|[\s«»“”"'’]+$/g, '').trim() || card.title,
      kind: card.kind,
      dateLabel: releaseDate.label,
      dateSortKey: releaseDate.sortKey,
      publishedAt: card.publishedAt,
      url: card.url,
      ...(card.imageUrl ? { imageUrl: card.imageUrl } : {}),
    })
  }

  return [...results.values()].sort((a, b) => a.dateSortKey.localeCompare(b.dateSortKey) || a.title.localeCompare(b.title, 'fr'))
}

/** Extracts a short editorial summary from a Disney France article's Open Graph metadata. */
export function parseDisneyPlusArticleDescription(html: string): string | undefined {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0] ?? ''
    const property = (attribute(tag, 'property') ?? attribute(tag, 'name') ?? '').toLowerCase()
    if (property !== 'og:description' && property !== 'description') continue
    let description = textContent(attribute(tag, 'content') ?? '')
    for (let attempt = 0; attempt < 3; attempt++) {
      description = description.replace(/^(?:visuels? disponibles? ICI|regarder[^.]{0,100}?ICI|t[eé]l[eé]charger[^.]{0,100}?ICI)\s*/i, '')
    }
    description = description.replace(/^PARIS,\s*France\s*\([^)]+\)\s*[–-]\s*/i, '')
      .replace(/\s*(?:regarder|t[eé]l[eé]charger)\b[\s\S]*$/i, '')
      .replace(/\s*[-–|]\s*Newsroom Walt Disney Company France\s*$/i, '')
      .replace(/\s*…\s*$/u, '…')
    if (description.length > 35) return description.slice(0, 240)
  }
  return undefined
}
