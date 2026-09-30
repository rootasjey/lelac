export interface PrimeVideoRelease {
  key: string
  title: string
  offer: string
  dateLabel: string
  dateSortKey: string
  url: string
  imageUrl?: string
}

export interface PrimeVideoReleasesResult {
  releases: PrimeVideoRelease[]
  total: number
  fetchedAt: string
  sourceUrl: string
}

interface HtmlNode {
  tag: string
  attrs: Record<string, string>
  parent?: HtmlNode
  children: Array<HtmlNode | string>
}

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
}

function parseAttributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
  for (const match of source.matchAll(pattern)) {
    const name = match[1]?.toLowerCase()
    if (name) attrs[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '')
  }
  return attrs
}

function parseHtml(source: string): HtmlNode {
  const root: HtmlNode = { tag: '#root', attrs: {}, children: [] }
  const stack = [root]
  const tokens = /<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][^>]*>|[^<]+/gi

  for (const token of source.match(tokens) ?? []) {
    if (token.startsWith('<!--') || token.startsWith('<!')) continue
    if (!token.startsWith('<')) {
      stack.at(-1)?.children.push(decodeEntities(token))
      continue
    }

    const closing = /^<\//.test(token)
    const tag = token.match(/^<\/?\s*([a-z0-9:-]+)/i)?.[1]?.toLowerCase()
    if (!tag) continue
    if (closing) {
      const index = stack.findLastIndex(node => node.tag === tag)
      if (index > 0) stack.length = index
      continue
    }

    const attrsSource = token.slice(token.match(/^<\s*[a-z0-9:-]+/i)?.[0].length ?? 1, token.length - 1)
    const node: HtmlNode = { tag, attrs: parseAttributes(attrsSource), parent: stack.at(-1), children: [] }
    node.parent?.children.push(node)
    if (!VOID_TAGS.has(tag) && !/\/\s*>$/.test(token)) stack.push(node)
  }

  return root
}

function textContent(node: HtmlNode): string {
  return node.children.map(child => typeof child === 'string' ? child : textContent(child)).join(' ').replace(/\s+/g, ' ').trim()
}

function descendants(node: HtmlNode, tag: string): HtmlNode[] {
  const found: HtmlNode[] = []
  for (const child of node.children) {
    if (typeof child === 'string') continue
    if (child.tag === tag) found.push(child)
    found.push(...descendants(child, tag))
  }
  return found
}

function safeAmazonUrl(value: string | undefined, base: string): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value, base)
    if (url.protocol !== 'https:' || !(url.hostname === 'amazon.com' || url.hostname.endsWith('.amazon.com') || url.hostname === 'createprimevideo.amazon' || url.hostname === 'www.createprimevideo.amazon' || url.hostname === 'amazonaws.com' || url.hostname.endsWith('.media-amazon.com'))) return undefined
    return url.toString()
  }
  catch {
    return undefined
  }
}

function safeImageUrl(value: string | undefined, base: string): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value, base)
    if (url.protocol !== 'https:' || !(url.hostname === 'amazonaws.com' || url.hostname.endsWith('.amazonaws.com') || url.hostname.endsWith('.media-amazon.com'))) return undefined
    return url.toString()
  }
  catch {
    return undefined
  }
}

const ENGLISH_MONTHS = 'january|february|march|april|may|june|july|august|september|october|november|december'
const FRENCH_MONTHS = 'janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre'

function parseDate(text: string): { label: string; key: string } | undefined {
  const english = text.match(new RegExp(`\\b(${ENGLISH_MONTHS})\\s+(\\d{1,2}),?\\s+(20\\d{2})\\b`, 'i'))
  const french = text.match(new RegExp(`\\b(\\d{1,2})(?:er)?\\s+(${FRENCH_MONTHS})\\s+(20\\d{2})\\b`, 'i'))
  if (english) {
    const date = new Date(`${english[1]} ${english[2]}, ${english[3]} 12:00:00 UTC`)
    if (!Number.isFinite(date.getTime())) return undefined
    return { label: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }), key: date.toISOString().slice(0, 10) }
  }
  if (french) {
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
    const normalizedMonth = french[2]!.toLocaleLowerCase('fr').normalize('NFD').replace(/\p{Diacritic}/gu, '')
    const monthIndex = months.findIndex(value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '') === normalizedMonth)
    const date = new Date(Date.UTC(Number(french[3]), monthIndex, Number(french[1]), 12))
    if (monthIndex < 0 || !Number.isFinite(date.getTime())) return undefined
    return { label: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }), key: date.toISOString().slice(0, 10) }
  }
  return undefined
}

function isFranceCode(text: string): boolean {
  return /(?:^|\s)FR(?:\s|$)/i.test(text)
}

function releaseFromLink(link: HtmlNode, todayKey: string): PrimeVideoRelease | null {
  const href = link.attrs.href
  if (!href) return null
  const url = safeAmazonUrl(href, 'https://www.createprimevideo.amazon/fr_fr/releaseCalendar')
  if (!url) return null
  const id = new URL(url).pathname.match(/\/showDetails\/([A-Z0-9]+)/i)?.[1]
  if (!id) return null

  let card: HtmlNode | undefined = link
  let details = ''
  for (let level = 0; card && level < 6; level++, card = card.parent) {
    const text = textContent(card)
    if (isFranceCode(text) && parseDate(text)) {
      details = text
      break
    }
  }
  if (!details) return null

  const date = parseDate(details)
  if (!date || date.key < todayKey) return null
  const image = descendants(card!, 'img')[0]
  const title = link.attrs['aria-label']?.trim()
    || link.attrs.title?.trim()
    || image?.attrs.alt?.trim()
    || textContent(link)
    || ''
  const cleanTitle = title.replace(/\s+/g, ' ').trim()
  // The source's accessible link label often contains only the series name,
  // while the row text carries the season (e.g. "Ballers Saison 5").
  const season = textContent(card!).match(/\bSaison\s+\d+\b/i)?.[0]
  const displayTitle = season && !/\bSaison\s+\d+\b/i.test(cleanTitle)
    ? `${cleanTitle} · ${season}`
    : cleanTitle
  if (!displayTitle || /^image$/i.test(displayTitle)) return null

  const offer = details.match(/(?:Included with Prime|Inclus(?:e|es)? avec Prime|Prime Video|Rent|Buy|Location|Achat)/i)?.[0] ?? 'Prime Video'
  const imageUrl = safeImageUrl(image?.attrs['data-src'] || image?.attrs.src || image?.attrs['data-srcset']?.split(/[ ,]/)[0], url)

  return {
    key: id,
    title: displayTitle,
    offer,
    dateLabel: date.label,
    dateSortKey: date.key,
    url,
    ...(imageUrl ? { imageUrl } : {}),
  }
}

/** Extracts upcoming French releases from Prime Video's public release-calendar page. */
export function parsePrimeVideoReleaseCalendar(html: string, today = new Date()): PrimeVideoRelease[] {
  const root = parseHtml(html)
  const todayKey = today.toISOString().slice(0, 10)
  const releases = new Map<string, PrimeVideoRelease>()
  for (const link of descendants(root, 'a')) {
    if (!/\/showDetails\//i.test(link.attrs.href ?? '')) continue
    const release = releaseFromLink(link, todayKey)
    if (release) releases.set(release.key, release)
  }
  return [...releases.values()].sort((a, b) => a.dateSortKey.localeCompare(b.dateSortKey) || a.title.localeCompare(b.title, 'fr'))
}

/** Groups seasons of a series when their French release date and offer match. */
export function groupPrimeVideoSeasons(releases: PrimeVideoRelease[]): PrimeVideoRelease[] {
  const seasonPattern = /^(.*?)\s+·\s+Saison\s+(\d+)$/i
  const grouped = new Map<string, { release: PrimeVideoRelease; representativeSeason: number; title: string; seasons: Set<number> }>()
  const standalone: PrimeVideoRelease[] = []

  for (const release of releases) {
    const match = release.title.match(seasonPattern)
    if (!match?.[1] || !match[2]) {
      standalone.push(release)
      continue
    }

    const series = match[1].trim()
    const groupKey = `${series.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('fr')}|${release.dateSortKey}|${release.offer.toLocaleLowerCase('fr')}`
    const season = Number(match[2])
    const group = grouped.get(groupKey)
    if (group) {
      group.seasons.add(season)
      if (season < group.representativeSeason) {
        group.release = release
        group.representativeSeason = season
      }
    }
    else grouped.set(groupKey, { release, representativeSeason: season, title: series, seasons: new Set([season]) })
  }

  const combined = [...grouped.values()].map(({ release, title, seasons }) => {
    const ordered = [...seasons].sort((a, b) => a - b)
    if (ordered.length === 1) return release

    const ranges: string[] = []
    for (let index = 0; index < ordered.length;) {
      let end = index
      while (end + 1 < ordered.length && ordered[end + 1] === ordered[end]! + 1) end++
      ranges.push(end - index >= 2
        ? `${ordered[index]}–${ordered[end]}`
        : ordered.slice(index, end + 1).join(', '))
      index = end + 1
    }

    return {
      ...release,
      key: `${release.key}:seasons-${ordered.join('-')}`,
      title: `${title} · Saisons ${ranges.join(', ')}`,
    }
  })

  return [...standalone, ...combined].sort((a, b) => a.dateSortKey.localeCompare(b.dateSortKey) || a.title.localeCompare(b.title, 'fr'))
}
