// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { groupCinemaShowings, isCinemaAreaId, normalizeCinemaShowings } from '../shared/utils/cinema'

const now = Date.parse('2026-09-22T12:00:00.000Z')
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
  it('accepts only configured area identifiers', () => {
    expect(isCinemaAreaId('versailles')).toBe(true)
    expect(isCinemaAreaId('paris')).toBe(true)
    expect(isCinemaAreaId('Maurepas')).toBe(false)
  })

  it('filters upcoming nearby screenings and normalizes dates and duration', () => {
    const rows = [
      showing(),
      showing({ _id: 'minutes-field', filmduration: 146 }),
      showing({ _id: 'expired', showstart: '2026-09-22T10:00:00+0200' }),
      showing({ _id: 'too-far', cinecp: '75001', '_coords.lat': 48.86, '_coords.lon': 2.35 }),
      showing({ _id: 'no-poster-url', showurl: 'javascript:alert(1)' }),
      showing({ _id: 'unsafe-poster', filmposter: 'javascript:alert(1)' }),
    ]
    const result = normalizeCinemaShowings(rows, 'trappes', now)
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

  it('uses postal codes to include Paris-area screenings without requiring coordinates', () => {
    const parisShowing = showing({ cinecp: '75005', cineville: 'Paris', '_coords.lat': undefined, '_coords.lon': undefined })
    expect(normalizeCinemaShowings([parisShowing], 'paris', now)).toHaveLength(1)
    expect(normalizeCinemaShowings([parisShowing], 'versailles', now)).toHaveLength(0)
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
    ], 'trappes', now)

    const films = groupCinemaShowings(showings)

    expect(films).toHaveLength(1)
    expect(films[0]?.showings).toHaveLength(2)
    expect(films[0]?.venues.map(venue => venue.cinema)).toEqual(['Cinéma test', 'Autre cinéma'])
  })
})
