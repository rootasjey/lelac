export type CinemaAreaId = 'versailles' | 'saint-quentin-en-yvelines' | 'trappes' | 'paris'

export interface CinemaArea {
  id: CinemaAreaId
  name: string
  postalPrefix: string
  center?: { lat: number; lon: number }
  radiusKm?: number
}

export const cinemaAreas: Record<CinemaAreaId, CinemaArea> = {
  versailles: { id: 'versailles', name: 'Versailles', postalPrefix: '78', center: { lat: 48.8014, lon: 2.1301 }, radiusKm: 22 },
  'saint-quentin-en-yvelines': { id: 'saint-quentin-en-yvelines', name: 'Saint-Quentin-en-Yvelines', postalPrefix: '78', center: { lat: 48.785, lon: 2.044 }, radiusKm: 16 },
  trappes: { id: 'trappes', name: 'Trappes', postalPrefix: '78', center: { lat: 48.7771, lon: 2.0028 }, radiusKm: 14 },
  paris: { id: 'paris', name: 'Paris', postalPrefix: '75' },
}

export const cinemaAreaOptions = Object.values(cinemaAreas)

export interface CinemaShowing {
  id: string
  filmId: string
  filmTitle: string
  director: string
  genre: string
  durationMinutes: number | null
  poster: string
  startsAt: string
  bookingUrl: string
  cinema: string
  city: string
  postalCode: string
}

export interface CinemaVenueSchedule {
  cinema: string
  city: string
  showings: CinemaShowing[]
}

export interface CinemaFilmSchedule {
  key: string
  filmTitle: string
  director: string
  genre: string
  durationMinutes: number | null
  poster: string
  venues: CinemaVenueSchedule[]
  showings: CinemaShowing[]
}

export interface CinemaScheduleResult {
  area: CinemaAreaId
  showings: CinemaShowing[]
  total: number
  fetchedAt: string
}

export interface RawCinemaShowing {
  _id?: unknown
  filmid?: unknown
  filmtitle?: unknown
  filmdirector?: unknown
  filmgenre?: unknown
  filmduration?: unknown
  filmposter?: unknown
  showstart?: unknown
  showurl?: unknown
  cineid?: unknown
  cinenom?: unknown
  cineville?: unknown
  cinecp?: unknown
  '_coords.lat'?: unknown
  '_coords.lon'?: unknown
}

export function isCinemaAreaId(value: unknown): value is CinemaAreaId {
  return typeof value === 'string' && Object.hasOwn(cinemaAreas, value)
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() && value !== 'null' ? value.trim() : ''
}

function number(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseDate(value: unknown) {
  const raw = text(value)
  if (!raw) return null
  const normalized = raw.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
  const timestamp = Date.parse(normalized)
  return Number.isFinite(timestamp) ? timestamp : null
}

function distanceKm(latA: number, lonA: number, latB: number, lonB: number) {
  const radians = (value: number) => value * Math.PI / 180
  const dLat = radians(latB - latA)
  const dLon = radians(lonB - lonA)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(latA)) * Math.cos(radians(latB)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function normalizeCinemaShowings(rows: RawCinemaShowing[], areaId: CinemaAreaId, now = Date.now()): CinemaShowing[] {
  const area = cinemaAreas[areaId]
  return rows.flatMap((row) => {
    const startsAt = text(row.showstart)
    const timestamp = parseDate(startsAt)
    const postalCode = text(row.cinecp)
    if (!timestamp || timestamp < now || !postalCode.startsWith(area.postalPrefix)) return []

    if (area.center && area.radiusKm) {
      const lat = number(row['_coords.lat'])
      const lon = number(row['_coords.lon'])
      if (lat === null || lon === null || distanceKm(area.center.lat, area.center.lon, lat, lon) > area.radiusKm) return []
    }

    const filmTitle = text(row.filmtitle)
    const cinema = text(row.cinenom)
    const city = text(row.cineville)
    if (!filmTitle || !cinema || !city) return []

    const durationSeconds = number(row.filmduration)
    const bookingUrl = text(row.showurl)
    return [{
      id: `${text(row.cineid) || cinema}:${text(row.filmid) || filmTitle}:${startsAt}:${text(row._id)}`,
      filmId: text(row.filmid),
      filmTitle,
      director: text(row.filmdirector),
      genre: text(row.filmgenre),
      // The dataset is mostly in minutes, but some imported rows use seconds.
      durationMinutes: durationSeconds !== null && durationSeconds > 0
        ? Math.round(durationSeconds > 300 ? durationSeconds / 60 : durationSeconds)
        : null,
      poster: /^https:\/\//i.test(text(row.filmposter)) ? text(row.filmposter) : '',
      startsAt: new Date(timestamp).toISOString(),
      bookingUrl: /^https:\/\//i.test(bookingUrl) ? bookingUrl : '',
      cinema,
      city,
      postalCode,
    }]
  }).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
}

export function groupCinemaShowings(showings: CinemaShowing[]): CinemaFilmSchedule[] {
  const films = new Map<string, CinemaFilmSchedule>()

  for (const showing of showings) {
    const key = showing.filmId || `${showing.filmTitle.trim().toLocaleLowerCase('fr-FR')}\u0000${showing.director.trim().toLocaleLowerCase('fr-FR')}`
    const film = films.get(key) ?? {
      key,
      filmTitle: showing.filmTitle,
      director: showing.director,
      genre: showing.genre,
      durationMinutes: showing.durationMinutes,
      poster: showing.poster,
      venues: [],
      showings: [],
    }

    film.showings.push(showing)
    let venue = film.venues.find(item => item.cinema === showing.cinema && item.city === showing.city)
    if (!venue) {
      venue = { cinema: showing.cinema, city: showing.city, showings: [] }
      film.venues.push(venue)
    }
    venue.showings.push(showing)
    films.set(key, film)
  }

  return [...films.values()]
    .map(film => ({
      ...film,
      venues: film.venues.sort((a, b) => Date.parse(a.showings[0]?.startsAt ?? '') - Date.parse(b.showings[0]?.startsAt ?? '')),
    }))
    .sort((a, b) => Date.parse(a.showings[0]?.startsAt ?? '') - Date.parse(b.showings[0]?.startsAt ?? ''))
}
