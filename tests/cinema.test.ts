// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { groupCinemaShowings, isCinemaLocation, normalizeCinemaShowings, type CinemaLocation } from '../shared/utils/cinema'

const now = Date.parse('2026-09-22T12:00:00.000Z')
const trappes: CinemaLocation = { inseeCode: '78621', name: 'Trappes', department: '78', lat: 48.7771, lon: 2.0028 }
const showing = (overrides: Record<string, unknown> = {}) => ({
  _id: 'screening-1',
  filmid: 'film-1',
  filmtitle: 'Film test',
  filmdirector: 'Réalisatrice test',
  filmgenre: 'Drame',
  filmduration: 7200,
  filmposter: 'https://example.com/poster.jpg',
  showstart: '2026-09-23T18:30:00+0200',
  showurl: 'https://example.com/tickets',
  cineid: 'cinema-1',
  cinenom: 'Cinéma test',
  cineville: 'Trappes',
  cinecp: '78190',
  '_coords.lat': 48.7771,
  '_coords.lon': 2.0028,
  ...overrides,
})

describe('cinema schedule normalization', () => {
  it('validates locations by commune code and coordinates', () => {
    expect(isCinemaLocation(trappes)).toBe(true)
    expect(isCinemaLocation({ ...trappes, lat: 100 })).toBe(false)
    expect(isCinemaLocation({ ...trappes, inseeCode: 'not-a-code' })).toBe(false)
  })

  it('filters upcoming nearby screenings and normalizes dates and duration', () => {
    const rows = [
      showing(),
      showing({ _id: 'minutes-field', filmduration: 146 }),
      showing({ _id: 'expired', showstart: '2026-09-22T10:00:00+0200' }),
      showing({ _id: 'too-far', cinecp: '69001', '_coords.lat': 45.76, '_coords.lon': 4.83 }),
      showing({ _id: 'no-poster-url', showurl: 'javascript:alert(1)' }),
      showing({ _id: 'unsafe-poster', filmposter: 'javascript:alert(1)' }),
    ]
    const result = normalizeCinemaShowings(rows, trappes, now)
    expect(result).toHaveLength(4)
    expect(result[0]).toMatchObject({
      filmTitle: 'Film test',
      durationMinutes: 120,
      startsAt: '2026-09-23T16:30:00.000Z',
      bookingUrl: 'https://example.com/tickets',
    })
    expect(result.find(item => item.id.includes('no-poster-url'))?.bookingUrl).toBe('')
    expect(result.find(item => item.id.includes('unsafe-poster'))?.poster).toBe('')
    expect(result.find(item => item.id.includes('minutes-field'))?.durationMinutes).toBe(146)
  })

  it('filters screenings by distance regardless of postal department', () => {
    const toulouse: CinemaLocation = { inseeCode: '31555', name: 'Toulouse', department: '31', lat: 43.6045, lon: 1.444 }
    const nearby = showing({ cinecp: '31000', cineville: 'Toulouse', '_coords.lat': 43.61, '_coords.lon': 1.45 })
    const tooFar = showing({ cinecp: '78000', cineville: 'Versailles', '_coords.lat': 48.8, '_coords.lon': 2.13 })
    const missingCoordinates = showing({ cinecp: '31000', '_coords.lat': undefined, '_coords.lon': undefined })
    expect(normalizeCinemaShowings([nearby, tooFar, missingCoordinates], toulouse, now)).toHaveLength(1)
  })

  it('groups screenings for the same film across cinemas', () => {
    const showings = normalizeCinemaShowings([
      showing(),
      showing({
        _id: 'screening-2',
        showstart: '2026-09-23T20:30:00+0200',
        cineid: 'cinema-2',
        cinenom: 'Autre cinéma',
        cineville: 'Versailles',
      }),
    ], trappes, now)

    const films = groupCinemaShowings(showings)

    expect(films).toHaveLength(1)
    expect(films[0]?.showings).toHaveLength(2)
    expect(films[0]?.venues.map(venue => venue.cinema)).toEqual(['Cinéma test', 'Autre cinéma'])
  })
})
