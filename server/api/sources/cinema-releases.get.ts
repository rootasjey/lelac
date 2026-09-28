import { groupUpcomingCinemaReleases, type CinemaReleaseResult } from '../../../shared/utils/cinema'
import { fetchNationalCinemaSchedule } from '../../utils/cinemaSchedule'

export default defineEventHandler(async (): Promise<CinemaReleaseResult> => {
  try {
    const schedule = await fetchNationalCinemaSchedule()
    const releases = groupUpcomingCinemaReleases(schedule.rows)
    return { releases, total: releases.length, fetchedAt: schedule.fetchedAt }
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Les prochaines séances du réseau SCARE sont momentanément indisponibles.' })
  }
})
