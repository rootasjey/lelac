import { isCinemaAreaId, normalizeCinemaShowings, type CinemaScheduleResult, type RawCinemaShowing } from '../../../shared/utils/cinema'

const CINEMA_API = 'https://datacinesindes.fr/data-fair/api/v1/datasets/programmation-cinemas/lines'
const SELECTED_FIELDS = [
  '_id', 'filmid', 'filmtitle', 'filmdirector', 'filmgenre', 'filmduration', 'filmposter',
  'showstart', 'showurl', 'cineid', 'cinenom', 'cineville', 'cinecp', '_coords.lat', '_coords.lon',
].join(',')

export default defineCachedEventHandler(async (event): Promise<CinemaScheduleResult> => {
  const requestedArea = getQuery(event).area
  const area = isCinemaAreaId(requestedArea) ? requestedArea : 'versailles'
  const postalPrefix = area === 'paris' ? '75' : '78'
  const query = new URLSearchParams({
    size: '1000',
    qs: `showstart:>=now AND cinecp:${postalPrefix}*`,
    select: SELECTED_FIELDS,
  })

  try {
    const response = await fetch(`${CINEMA_API}?${query}`, {
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: 'application/json', 'User-Agent': 'Encascade cinema schedule widget' },
    })
    if (!response.ok) throw new Error(`SCARE API responded with status ${response.status}`)
    const payload = await response.json() as { results?: RawCinemaShowing[] }
    const showings = normalizeCinemaShowings(Array.isArray(payload.results) ? payload.results : [], area)
    return { area, showings, total: showings.length, fetchedAt: new Date().toISOString() }
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'La programmation des cinémas est momentanément indisponible.' })
  }
}, {
  getKey: event => {
    const requestedArea = getQuery(event).area
    return `cinema-schedule-v3:${isCinemaAreaId(requestedArea) ? requestedArea : 'versailles'}`
  },
  maxAge: 900,
  swr: true,
})
