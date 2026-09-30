import { parseDisneyPlusAnnouncements, parseDisneyPlusArticleDescription, type DisneyPlusAnnouncementsResult } from '../../../shared/utils/disneyPlusAnnouncements'

const SOURCE_URL = 'https://newsroom.disney.fr/disney+.html'

export default defineCachedEventHandler(async (): Promise<DisneyPlusAnnouncementsResult> => {
  try {
    const response = await fetch(SOURCE_URL, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Encascade Disney+ announcements widget (official source links)',
      },
    })
    if (!response.ok) throw new Error(`Disney France returned HTTP ${response.status}`)

    const announcements = parseDisneyPlusAnnouncements(await response.text()).slice(0, 18)
    if (!announcements.length) throw new Error('Disney France did not return any current, dated Disney+ announcements')

    const enriched = await Promise.all(announcements.map(async (announcement) => {
      try {
        const article = await fetch(announcement.url, {
          signal: AbortSignal.timeout(4_500),
          headers: {
            Accept: 'text/html,application/xhtml+xml',
            'User-Agent': 'Encascade Disney+ announcements widget (short source excerpt and attribution)',
          },
        })
        if (!article.ok) return announcement
        const description = parseDisneyPlusArticleDescription(await article.text())
        return description ? { ...announcement, description } : announcement
      }
      catch {
        return announcement
      }
    }))

    return {
      announcements: enriched,
      total: enriched.length,
      fetchedAt: new Date().toISOString(),
      sourceUrl: SOURCE_URL,
    }
  }
  catch {
    throw createError({ statusCode: 502, statusMessage: 'Les annonces Disney+ France sont momentanément indisponibles.' })
  }
}, {
  getKey: () => 'disney-plus-fr-announcements-v2',
  maxAge: 21_600,
  swr: true,
})
