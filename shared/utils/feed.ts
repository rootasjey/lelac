import { XMLParser } from 'fast-xml-parser'

export interface FeedArticle { title: string; source: string; link: string; date: string }
export interface FeedResult { articles: FeedArticle[]; source: string; fetchedAt: string }

const parser = new XMLParser({
  attributeNamePrefix: '@_',
  ignoreAttributes: false,
  ignoreDeclaration: true,
  parseAttributeValue: false,
  parseTagValue: false,
  processEntities: false,
  trimValues: true,
})

type XmlObject = Record<string, unknown>

function asObject(value: unknown): XmlObject | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as XmlObject : undefined
}

function asList(value: unknown): unknown[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function decodeEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, name: string) => {
    const normalized = name.toLowerCase()
    if (normalized === 'amp') return '&'
    if (normalized === 'lt') return '<'
    if (normalized === 'gt') return '>'
    if (normalized === 'quot') return '"'
    if (normalized === 'apos') return "'"
    const codePoint = normalized.startsWith('#x')
      ? Number.parseInt(normalized.slice(2), 16)
      : Number.parseInt(normalized.slice(1), 10)
    if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) return entity
    return String.fromCodePoint(codePoint)
  })
}

function textValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(' ')
  const object = asObject(value)
  if (!object) return ''
  const text = object['#text'] ?? object.__cdata
  return text === undefined ? '' : textValue(text)
}

function plainText(value: unknown): string {
  return decodeEntities(textValue(value))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function articleDate(value: unknown): string {
  const raw = plainText(value)
  if (!raw) return ''
  const timestamp = Date.parse(raw)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : ''
}

export function safeArticleUrl(input: unknown, baseUrl?: string): string | null {
  try {
    const url = new URL(decodeEntities(String(input).trim()), baseUrl)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch { return null }
}

export function parseFeedXml(xml: string, feedUrl: string): FeedResult {
  const markup = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '').replace(/<!--[\s\S]*?-->/g, '')
  if (!xml.trim() || /<!DOCTYPE|<!ENTITY/i.test(markup)) throw new Error('Unsupported XML document')

  const root = asObject(parser.parse(xml))
  const atomFeed = asObject(root?.feed)
  const rssRoot = asObject(root?.rss)
  const rdfRoot = asObject(root?.['rdf:RDF'])
  const channel = asObject(rssRoot?.channel) ?? asObject(rdfRoot?.channel)
  if (!atomFeed && !channel && !rdfRoot) throw new Error('Unsupported RSS or Atom document')

  const entries = atomFeed
    ? asList(atomFeed.entry)
    : asList(channel?.item ?? rdfRoot?.item)
  const source = plainText(atomFeed?.title ?? channel?.title) || new URL(feedUrl).hostname.replace(/^www\./, '')
  const seenLinks = new Set<string>()
  const articles = entries.flatMap((entry): FeedArticle[] => {
    const item = asObject(entry)
    if (!item) return []

    const title = plainText(item.title)
    const atomLinks = asList(item.link).map(asObject).filter((link): link is XmlObject => Boolean(link))
    const alternate = atomLinks.find(link => {
      const rel = textValue(link['@_rel'])
      return !rel || rel === 'alternate'
    })
    const linkValue = alternate?.['@_href'] ?? item.link
    const rawLink = textValue(linkValue)
    if (!rawLink) return []
    const link = safeArticleUrl(rawLink, feedUrl)
    if (!title || !link || seenLinks.has(link)) return []
    seenLinks.add(link)

    const date = articleDate(item.pubDate ?? item['dc:date'] ?? item.published ?? item.updated ?? item.date)
    return [{ title, source, link, date }]
  }).slice(0, 50)

  return { articles, source, fetchedAt: new Date().toISOString() }
}
