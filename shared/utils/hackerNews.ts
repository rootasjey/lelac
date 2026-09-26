export interface HackerNewsStory {
  id: number
  title: string
  url: string
  source: string
  points: number
  comments: number
  publishedAt: string
}

export interface HackerNewsResult {
  stories: HackerNewsStory[]
  source: string
  fetchedAt: string
}

export function normalizeHackerNewsStory(value: unknown): HackerNewsStory | null {
  if (!value || typeof value !== 'object') return null
  const story = value as Record<string, unknown>
  if (typeof story.id !== 'number' || !Number.isSafeInteger(story.id) || typeof story.title !== 'string' || !story.title.trim()) return null
  const publishedAt = typeof story.time === 'number' && Number.isFinite(story.time)
    ? new Date(story.time * 1000).toISOString()
    : ''
  let url = typeof story.url === 'string' ? story.url : ''
  try {
    if (url) {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') url = ''
    }
  } catch { url = '' }
  let source = 'news.ycombinator.com'
  if (url) {
    try { source = new URL(url).hostname.replace(/^www\./, '') } catch { /* keep fallback */ }
  }
  return {
    id: story.id,
    title: story.title.trim(),
    url,
    source,
    points: typeof story.score === 'number' && Number.isFinite(story.score) ? Math.max(0, Math.round(story.score)) : 0,
    comments: typeof story.descendants === 'number' && Number.isFinite(story.descendants) ? Math.max(0, Math.round(story.descendants)) : 0,
    publishedAt,
  }
}
