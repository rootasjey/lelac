export interface FeedArticle { title: string; source: string; link: string; date: string }
export interface FeedResult { articles: FeedArticle[]; source: string; fetchedAt: string }
export function safeArticleUrl(input: unknown): string | null {
  try { const url = new URL(String(input)); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null } catch { return null }
}
export function normalizeFeed(data: { feed?: { title?: string }; items?: Array<{ title?: string; link?: string; pubDate?: string }> }, feedUrl: string): FeedResult {
  const source = data.feed?.title || new URL(feedUrl).hostname
  const articles = (data.items ?? []).slice(0, 50).flatMap(item => {
    const link = safeArticleUrl(item.link)
    if (!link || !item.title) return []
    // rss2json uses UTC dates without an explicit timezone.
    const raw = item.pubDate ?? ''
    const date = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw) ? raw.replace(' ', 'T') + 'Z' : raw
    return [{ title: item.title, source, link, date: Number.isFinite(Date.parse(date)) ? new Date(date).toISOString() : '' }]
  })
  return { articles, source, fetchedAt: new Date().toISOString() }
}
