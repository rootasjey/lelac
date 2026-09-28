import {
  CINEMA_SEARCH_RADIUS_KM,
  isCinemaLocation,
  normalizeCinemaShowings,
  type CinemaLocation,
  type CinemaScheduleResult,
} from '../../../shared/utils/cinema'
import { fetchNationalCinemaSchedule } from '../../utils/cinemaSchedule'

export default defineEventHandler(async (event): Promise<CinemaScheduleResult> => {
  const query = getQuery(event)
  const location: CinemaLocation = {
    inseeCode: typeof query.inseeCode === 'string' ? query.inseeCode : '',
    name: typeof query.name === 'string' ? query.name : '',
    department: typeof query.department === 'string' ? query.department : '',
    lat: Number(query.lat),
    lon: Number(query.lon),
  }
  if (!isCinemaLocation(location)) throw createError({ statusCode: 400, statusMessage: 'Choisissez une commune valide.' })

  try {
    const schedule = await fetchNationalCinemaSchedule()
    const showings = normalizeCinemaShowings(schedule.rows, location)
    return { location, showings, total: showings.length, fetchedAt: schedule.fetchedAt }
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'La programmation des cinémas est momentanément indisponible.' })
  }
})
