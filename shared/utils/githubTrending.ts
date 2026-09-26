export type GitHubTrendingPeriod = 'daily' | 'weekly' | 'monthly'

export interface GitHubTrendingRepository {
  fullName: string
  description: string
  language: string
  stars: number
  forks: number
  starsPeriod: number
  url: string
}

export interface GitHubTrendingResult {
  repositories: GitHubTrendingRepository[]
  period: GitHubTrendingPeriod
  language: string
  source: string
  fetchedAt: string
}

export interface GitHubTrendingDeveloper {
  username: string
  displayName: string
  avatarUrl: string
  url: string
  popularRepository: string
  popularRepositoryUrl: string
  popularRepositoryDescription: string
}

export interface GitHubTrendingDevelopersResult {
  developers: GitHubTrendingDeveloper[]
  period: GitHubTrendingPeriod
  language: string
  source: string
  fetchedAt: string
}

const PERIOD_LABELS: Record<GitHubTrendingPeriod, string> = {
  daily: 'today',
  weekly: 'this week',
  monthly: 'this month',
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
    return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : entity
  })
}

function textContent(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
}

function numberContent(value: string): number {
  const normalized = textContent(value).replace(/[^\d]/g, '')
  return normalized ? Number(normalized) : 0
}

function matchText(block: string, expression: RegExp): string {
  return textContent(block.match(expression)?.[1] ?? '')
}

function anchorTextForHref(block: string, href: string): string {
  for (const match of block.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    if (decodeEntities(match[1] ?? '') === href) return match[2] ?? ''
  }
  return ''
}

function periodStars(block: string, period: GitHubTrendingPeriod): number {
  const label = PERIOD_LABELS[period].replace(' ', '\\s+')
  return numberContent(matchText(block, new RegExp(`([\\d,]+)\\s+stars?\\s+${label}`, 'i')))
}

/** Parse the public GitHub Trending repository page into a stable, small payload. */
export function parseGitHubTrendingHtml(html: string, period: GitHubTrendingPeriod, language = ''): GitHubTrendingResult {
  if (!html.trim()) throw new Error('Empty GitHub Trending response')

  const repositories: GitHubTrendingRepository[] = []
  const articlePattern = /<article\b[^>]*class=["'][^"']*\bBox-row\b[^"']*["'][^>]*>[\s\S]*?<\/article>/gi
  for (const match of html.matchAll(articlePattern)) {
    const block = match[0]
    const repositoryPath = block.match(/<h2\b[\s\S]*?<a\b[^>]*href=["']\/([^"']+)["'][^>]*>[\s\S]*?<\/a>\s*<\/h2>/i)?.[1]
    if (!repositoryPath || repositoryPath.split('/').length !== 2) continue
    const fullName = decodeEntities(repositoryPath)
    const starsHref = `/${repositoryPath}/stargazers`
    const forksHref = `/${repositoryPath}/forks`
    const starsBlock = anchorTextForHref(block, starsHref)
    const forksBlock = anchorTextForHref(block, forksHref)
    repositories.push({
      fullName,
      description: matchText(block, /<p\b[^>]*class=["'][^"']*color-fg-muted[^"']*["'][^>]*>([\s\S]*?)<\/p>/i),
      language: matchText(block, /<span\b[^>]*itemprop=["']programmingLanguage["'][^>]*>([\s\S]*?)<\/span>/i),
      stars: numberContent(starsBlock),
      forks: numberContent(forksBlock),
      starsPeriod: periodStars(block, period),
      url: `https://github.com/${fullName}`,
    })
  }

  return {
    repositories: repositories.slice(0, 25),
    period,
    language,
    source: 'GitHub Trending',
    fetchedAt: new Date().toISOString(),
  }
}

/** Parse the public GitHub Trending developers page into a stable, small payload. */
export function parseGitHubTrendingDevelopersHtml(html: string, period: GitHubTrendingPeriod, language = ''): GitHubTrendingDevelopersResult {
  if (!html.trim()) throw new Error('Empty GitHub Trending developers response')

  const developers: GitHubTrendingDeveloper[] = []
  const articleStart = /<article\b[^>]*class=["'][^"']*\bBox-row\b[^"']*["'][^>]*>/gi
  const starts = [...html.matchAll(articleStart)].map(match => match.index ?? -1).filter(index => index >= 0)
  for (let index = 0; index < starts.length; index++) {
    const start = starts[index]!
    const block = html.slice(start, starts[index + 1] ?? html.length)
    const profile = block.match(/<a\b[^>]*href=["']\/([^"'/]+)["'][^>]*>\s*<img\b[^>]*src=["']([^"']+)["']/i)
    const username = profile?.[1]
    if (!username) continue
    const displayName = matchText(block, /<h1\b[^>]*class=["'][^"']*\bh3\b[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*>([\s\S]*?)<\/a>/i)
    const popularRepository = matchText(block, /<h1\b[^>]*class=["'][^"']*\bh4\b[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*href=["']\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/i)
    const repositoryPath = block.match(/<h1\b[^>]*class=["'][^"']*\bh4\b[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*href=["']\/([^"']+)["']/i)?.[1] ?? ''
    const popularRepositoryDescription = matchText(block, /<h1\b[^>]*class=["'][^"']*\bh4\b[^"']*["'][\s\S]*?<\/h1>\s*<div\b[^>]*class=["'][^"']*color-fg-muted[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
    developers.push({
      username,
      displayName: displayName || username,
      avatarUrl: decodeEntities(profile?.[2] ?? ''),
      url: `https://github.com/${username}`,
      popularRepository,
      popularRepositoryUrl: repositoryPath ? `https://github.com/${decodeEntities(repositoryPath)}` : `https://github.com/${username}`,
      popularRepositoryDescription,
    })
  }

  return {
    developers: developers.slice(0, 25),
    period,
    language,
    source: 'GitHub Trending Developers',
    fetchedAt: new Date().toISOString(),
  }
}
