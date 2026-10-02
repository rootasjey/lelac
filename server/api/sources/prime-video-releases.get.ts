import { groupPrimeVideoSeasons, parsePrimeVideoReleaseCalendar, type PrimeVideoReleasesResult } from '../../../shared/utils/primeVideoReleases'

const SOURCE_URL = 'https://www.createprimevideo.amazon/fr_fr/releaseCalendar'

export default defineCachedEventHandler(async (): Promise<PrimeVideoReleasesResult> => {
  try {
    const response = await fetch(SOURCE_URL, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Le Lac streaming calendar widget (Prime Video France source links)',
      },
    })
    if (!response.ok) throw new Error(`Prime Video returned HTTP ${response.status}`)

    const releases = groupPrimeVideoSeasons(parsePrimeVideoReleaseCalendar(await response.text()))
    if (!releases.length) throw new Error('Prime Video release calendar contained no dated French titles')

    return {
      releases,
      total: releases.length,
      fetchedAt: new Date().toISOString(),
      sourceUrl: SOURCE_URL,
    }
  }
  catch {
    throw createError({ statusCode: 502, statusMessage: 'Le calendrier Prime Video France est momentanément indisponible.' })
  }
}, {
  // Release dates can be updated frequently; keep stale upstream data bounded to one hour.
  getKey: () => 'prime-video-fr-release-calendar-v4',
  maxAge: 3_600,
  swr: true,
})
