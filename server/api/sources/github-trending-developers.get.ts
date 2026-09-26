import { parseGitHubTrendingDevelopersHtml, type GitHubTrendingPeriod } from '../../../shared/utils/githubTrending'

const PERIODS = new Set<GitHubTrendingPeriod>(['daily', 'weekly', 'monthly'])
const FETCH_TIMEOUT_MS = 12_000

export default defineCachedEventHandler(async (event) => {
  const query = getQuery(event)
  const period = typeof query.period === 'string' && PERIODS.has(query.period as GitHubTrendingPeriod)
    ? query.period as GitHubTrendingPeriod
    : 'daily'
  const language = typeof query.language === 'string' ? query.language.trim() : ''
  if (language.length > 50 || /[\u0000-\u001f]/.test(language)) {
    throw createError({ statusCode: 400, statusMessage: 'Langage GitHub invalide' })
  }

  const path = language ? `/trending/developers/${encodeURIComponent(language)}` : '/trending/developers'
  const url = new URL(path, 'https://github.com')
  url.searchParams.set('since', period)

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Encascade GitHub Trending Developers widget',
      },
    })
    if (!response.ok) throw new Error(`GitHub responded with status ${response.status}`)
    return parseGitHubTrendingDevelopersHtml(await response.text(), period, language)
  } catch (cause) {
    const status = cause instanceof Error ? cause.message.match(/status (\d+)/)?.[1] : undefined
    throw createError({
      statusCode: 502,
      statusMessage: status ? `GitHub a répondu avec HTTP ${status}.` : 'GitHub Trending Developers est indisponible.',
    })
  }
}, { maxAge: 900, swr: true })
