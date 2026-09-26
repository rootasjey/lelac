import {
  CINEMA_SEARCH_RADIUS_KM,
  isCinemaLocation,
  normalizeCinemaShowings,
  type CinemaLocation,
  type CinemaScheduleResult,
  type RawCinemaShowing,
} from '../../../shared/utils/cinema'

const CINEMA_API = 'https://datacinesindes.fr/data-fair/api/v1/datasets/programmation-cinemas/lines'
const SELECTED_FIELDS = [
  '_id', 'filmid', 'filmtitle', 'filmdirector', 'filmgenre', 'filmduration', 'filmposter',
  'showstart', 'showurl', 'cineid', 'cinenom', 'cineville', 'cinecp', '_coords.lat', '_coords.lon',
].join(',')

interface CinemaApiResponse {
  results?: RawCinemaShowing[]
  total?: number
}

const fetchNationalSchedule = defineCachedFunction(async (): Promise<{ rows: RawCinemaShowing[]; fetchedAt: string }> => {
  const query = new URLSearchParams({
    size: '10000',
    qs: 'showstart:>=now',
    select: SELECTED_FIELDS,
  })
  const response = await $fetch<CinemaApiResponse>(`${CINEMA_API}?${query}`, {
    timeout: 12_000,
    retry: 0,
    headers: { Accept: 'application/json', 'User-Agent': 'Encascade cinema schedule widget' },
  })
  const rows = Array.isArray(response.results) ? response.results : []
  if (response.total !== undefined && response.total > rows.length) {
    throw new Error(`SCARE returned ${rows.length} of ${response.total} upcoming showings.`)
  }
  return { rows, fetchedAt: new Date().toISOString() }
}, {
  name: 'scare-national-schedule-v1',
  maxAge: 900,
  swr: true,
})

export default defineEventHandler(async (event): Promise<CinemaScheduleResult> => {
  const query = getQuery(event)
  const location: CinemaLocation = {
    inseeCode: typeof query.inseeCode === 'string' ? query.inseeCode : '',
    name: typeof query.name === 'string' ? query.name : '',
    department: typeof query.department === 'string' ? query.department : '',
    lat: Number(query.lat),
    lon: Number(query.lon),
  }
  if (!isCinemaLocation(location)) {
    throw createError({ statusCode: 400, statusMessage: 'Choisissez une commune valide.' })
  }

  try {
    const schedule = await fetchNationalSchedule()
    const showings = normalizeCinemaShowings(schedule.rows, location)
    return { location, showings, total: showings.length, fetchedAt: schedule.fetchedAt }
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'La programmation des cinémas est momentanément indisponible.' })
  }
})
