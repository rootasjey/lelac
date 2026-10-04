import type { RawCinemaShowing } from '../../shared/utils/cinema'

const CINEMA_API = 'https://datacinesindes.fr/data-fair/api/v1/datasets/programmation-cinemas/lines'
const SELECTED_FIELDS = [
  '_id', 'filmid', 'filmtitle', 'filmdirector', 'filmgenre', 'filmduration', 'filmposter',
  'showstart', 'showurl', 'cineid', 'cinenom', 'cineville', 'cinecp', '_coords.lat', '_coords.lon',
].join(',')

interface CinemaApiResponse {
  results?: RawCinemaShowing[]
  total?: number
  next?: string
}

export const fetchNationalCinemaSchedule = defineCachedFunction(async (): Promise<{ rows: RawCinemaShowing[]; fetchedAt: string }> => {
  const query = new URLSearchParams({ size: '10000', qs: 'showstart:>=now', select: SELECTED_FIELDS })
  const rows: RawCinemaShowing[] = []
  const visitedPages = new Set<string>()
  let nextPage: string | undefined = `${CINEMA_API}?${query}`
  let reportedTotal: number | undefined

  try {
    while (nextPage) {
      if (visitedPages.has(nextPage) || visitedPages.size >= 100) throw new Error('SCARE pagination did not finish safely.')
      visitedPages.add(nextPage)

      const response: CinemaApiResponse = await $fetch<CinemaApiResponse>(nextPage, {
        timeout: 12_000,
        retry: 0,
        headers: { Accept: 'application/json', 'User-Agent': 'Le Lac cinema schedule widget' },
      })
      if (response.total !== undefined) {
        if (reportedTotal !== undefined && reportedTotal !== response.total) {
          console.warn('[SCARE] Dataset total changed during pagination.', {
            firstTotal: reportedTotal,
            pageTotal: response.total,
            page: visitedPages.size,
          })
        }
        reportedTotal ??= response.total
      }
      if (!Array.isArray(response.results)) throw new Error('SCARE returned an invalid results page.')
      rows.push(...response.results)

      if (response.next) {
        const nextUrl = new URL(response.next)
        const apiUrl = new URL(CINEMA_API)
        if (nextUrl.origin !== apiUrl.origin || !/^\/data-fair\/api\/v1\/datasets\/[^/]+\/lines$/.test(nextUrl.pathname)) {
          throw new Error('SCARE returned an unexpected pagination URL.')
        }
        nextPage = nextUrl.href
      } else nextPage = undefined
    }
  } catch (error) {
    const detail = error instanceof Error ? `${error.name}: ${error.message.replace(/https?:\/\/\S+/g, '[upstream URL]')}` : 'Unknown error'
    const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
      ? (error as { statusCode?: unknown }).statusCode
      : undefined
    console.error('[SCARE] Failed to fetch the national cinema schedule.', {
      pagesFetched: visitedPages.size,
      rowsFetched: rows.length,
      statusCode,
      detail,
    })
    throw error
  }

  if (reportedTotal !== undefined && reportedTotal !== rows.length) {
    console.warn('[SCARE] Pagination completed with a dataset total that differs from the fetched rows.', {
      reportedTotal,
      rowsFetched: rows.length,
    })
  }
  return { rows, fetchedAt: new Date().toISOString() }
}, { name: 'scare-national-schedule-v1', maxAge: 900, swr: true })
