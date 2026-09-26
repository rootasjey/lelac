import { normalizeHackerNewsStory, type HackerNewsResult } from '../../../shared/utils/hackerNews'

const API_BASE = 'https://hacker-news.firebaseio.com/v0'
const FETCH_TIMEOUT_MS = 12_000
const STORY_LIMIT = 20

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { Accept: 'application/json', 'User-Agent': 'Encascade Hacker News widget' },
  })
  if (!response.ok) throw new Error(`Hacker News responded with status ${response.status}`)
  return await response.json() as T
}

export default defineCachedEventHandler(async () => {
  try {
    const ids = await fetchJson<unknown>(`${API_BASE}/topstories.json`)
    if (!Array.isArray(ids)) throw new Error('Invalid Hacker News story list')
    const stories = await Promise.all(ids.slice(0, STORY_LIMIT).map(async id => {
      if (typeof id !== 'number' || !Number.isSafeInteger(id)) return null
      try { return normalizeHackerNewsStory(await fetchJson(`${API_BASE}/item/${id}.json`)) } catch { return null }
    }))
    const result: HackerNewsResult = {
      stories: stories.filter((story): story is NonNullable<typeof story> => story !== null),
      source: 'Hacker News',
      fetchedAt: new Date().toISOString(),
    }
    if (!result.stories.length) throw new Error('Hacker News returned no stories')
    return result
  } catch (cause) {
    const status = cause instanceof Error ? cause.message.match(/status (\d+)/)?.[1] : undefined
    throw createError({
      statusCode: 502,
      statusMessage: status ? `Hacker News a répondu avec HTTP ${status}.` : 'Hacker News est indisponible.',
    })
  }
}, { maxAge: 300, swr: true })
