import { parseAppleTvReleaseCalendar, type AppleTvReleasesResult } from '../../../shared/utils/appleTvReleases'

const SOURCE_URL = 'https://www.apple.com/fr/tv-pr/originals.originals.json'

export default defineCachedEventHandler(async (): Promise<AppleTvReleasesResult> => {
  try {
    const response = await fetch(SOURCE_URL, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Le Lac streaming calendar widget (Apple TV Press titles and source links)',
      },
    })
    if (!response.ok) throw new Error(`Apple TV Press returned HTTP ${response.status}`)

    const releases = parseAppleTvReleaseCalendar(await response.json())
    if (!releases.length) throw new Error('Apple TV Press catalogue contained no dated upcoming titles')

    return {
      releases,
      total: releases.length,
      fetchedAt: new Date().toISOString(),
      sourceUrl: SOURCE_URL,
    }
  }
  catch {
    throw createError({ statusCode: 502, statusMessage: 'Le calendrier Apple Originals est momentanément indisponible.' })
  }
}, {
  getKey: () => 'apple-tv-fr-release-calendar-v1',
  maxAge: 21_600,
  swr: true,
})
