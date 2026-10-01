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
  let expectedTotal: number | undefined

  while (nextPage) {
    if (visitedPages.has(nextPage) || visitedPages.size >= 100) throw new Error('SCARE pagination did not finish safely.')
    visitedPages.add(nextPage)

    const response: CinemaApiResponse = await $fetch<CinemaApiResponse>(nextPage, {
      timeout: 12_000,
      retry: 0,
      headers: { Accept: 'application/json', 'User-Agent': 'Trame cinema schedule widget' },
    })
    if (response.total !== undefined) {
      if (expectedTotal !== undefined && expectedTotal !== response.total) throw new Error('SCARE result count changed during pagination.')
      expectedTotal = response.total
    }
    if (Array.isArray(response.results)) rows.push(...response.results)

    if (response.next) {
      const nextUrl = new URL(response.next)
      const apiUrl = new URL(CINEMA_API)
      if (nextUrl.origin !== apiUrl.origin || !/^\/data-fair\/api\/v1\/datasets\/[^/]+\/lines$/.test(nextUrl.pathname)) {
        throw new Error('SCARE returned an unexpected pagination URL.')
      }
      nextPage = nextUrl.href
    } else nextPage = undefined
  }

  if (expectedTotal !== undefined && expectedTotal > rows.length) throw new Error(`SCARE returned ${rows.length} of ${expectedTotal} upcoming showings.`)
  return { rows, fetchedAt: new Date().toISOString() }
}, { name: 'scare-national-schedule-v1', maxAge: 900, swr: true })
