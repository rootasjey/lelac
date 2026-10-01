import { parseNetflixReleaseCalendar, parseNetflixTitleArtwork, type NetflixRelease, type NetflixReleasesResult } from '../../../shared/utils/netflixReleases'

const SOURCE_URL = 'https://about.netflix.com/fr/news/calendrier-de-sorties-originals-france'

export default defineCachedEventHandler(async (): Promise<NetflixReleasesResult> => {
  try {
    const response = await fetch(SOURCE_URL, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Trame streaming calendar widget (metadata and source links)',
      },
    })
    if (!response.ok) throw new Error(`Netflix returned HTTP ${response.status}`)

    const releases = parseNetflixReleaseCalendar(await response.text())
    if (!releases.length) throw new Error('Netflix release calendar contained no dated upcoming titles')

    const releasesWithArtwork = await Promise.all(releases.map(async (release): Promise<NetflixRelease> => {
      try {
        const titlePage = await fetch(release.url, {
          signal: AbortSignal.timeout(3_500),
          headers: {
            Accept: 'text/html,application/xhtml+xml',
            'User-Agent': 'Trame streaming calendar widget (official Netflix artwork links)',
          },
        })
        if (!titlePage.ok) return release
        const imageUrl = parseNetflixTitleArtwork(await titlePage.text())
        return imageUrl ? { ...release, imageUrl } : release
      }
      catch {
        return release
      }
    }))

    return {
      releases: releasesWithArtwork,
      total: releasesWithArtwork.length,
      fetchedAt: new Date().toISOString(),
      sourceUrl: SOURCE_URL,
    }
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Le calendrier Netflix France est momentanément indisponible.' })
  }
}, {
  getKey: () => 'netflix-fr-release-calendar-v2',
  maxAge: 21_600,
  swr: true,
})
