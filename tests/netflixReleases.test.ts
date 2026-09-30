// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parseNetflixReleaseCalendar, parseNetflixTitleArtwork } from '../shared/utils/netflixReleases'

describe('Netflix France release calendar parser', () => {
  const today = new Date('2026-09-30T12:00:00.000Z')

  it('extracts only dated upcoming titles before the production section and sorts them chronologically', () => {
    const html = `
      <h3>CALENDRIER DE SORTIES ET DE PRODUCTION EN COURS</h3>
      <h3><a href="https://media.netflix.com/fr/only-on-netflix/1">L'ARENE</a> - COMPETITION - 30 SEPTEMBRE 2026</h3>
      <h3><a href="https://media.netflix.com/fr/only-on-netflix/2">A L'EST D'EDEN</a> - SERIE - 1ER OCTOBRE 2026</h3>
      <h3><a href="https://media.netflix.com/fr/only-on-netflix/3">Quasimodo</a> - FILM - AUTOMNE 2026</h3>
      <h3>EN PRODUCTION - TOURNAGE</h3>
      <h3><a href="https://media.netflix.com/fr/only-on-netflix/4">Un titre sans date</a></h3>
    `

    expect(parseNetflixReleaseCalendar(html, today)).toEqual([
      {
        key: '1',
        title: "L'ARENE",
        kind: 'COMPETITION',
        dateLabel: '30 SEPTEMBRE 2026',
        dateSortKey: '2026-09-30',
        url: 'https://www.netflix.com/fr/title/1',
      },
      {
        key: '2',
        title: "A L'EST D'EDEN",
        kind: 'SERIE',
        dateLabel: '1ER OCTOBRE 2026',
        dateSortKey: '2026-10-01',
        url: 'https://www.netflix.com/fr/title/2',
      },
      {
        key: '3',
        title: 'Quasimodo',
        kind: 'FILM',
        dateLabel: 'AUTOMNE 2026',
        dateSortKey: '2026-10-01',
        url: 'https://www.netflix.com/fr/title/3',
      },
    ].sort((a, b) => a.dateSortKey.localeCompare(b.dateSortKey)))
  })

  it('keeps hyphens in linked titles, decodes entities, and ignores links outside Netflix Media Center', () => {
    const html = `
      <h3><a href="https://media.netflix.com/en/only-on-netflix/5">The Further Mis-Adventures &amp; More</a> - FILM - 23 DECEMBRE 2026</h3>
      <h3><a href="https://example.com/title">Not a Netflix title</a> - FILM - 24 DECEMBRE 2026</h3>
    `

    expect(parseNetflixReleaseCalendar(html, today)).toMatchObject([
      { key: '5', title: 'The Further Mis-Adventures & More', kind: 'FILM', dateSortKey: '2026-12-23', url: 'https://www.netflix.com/fr/title/5' },
    ])
  })

  it('extracts and validates Netflix-hosted title artwork from page metadata', () => {
    expect(parseNetflixTitleArtwork('<meta property="og:image" content="https://occ-0-4452-2567.1.nflxso.net/title.jpg?r=6a7&amp;w=1200">'))
      .toBe('https://occ-0-4452-2567.1.nflxso.net/title.jpg?r=6a7&w=1200')
    expect(parseNetflixTitleArtwork('<meta name="twitter:image" content="//occ-0-4452-2567.1.nflxso.net/title.jpg">'))
      .toBe('https://occ-0-4452-2567.1.nflxso.net/title.jpg')
    expect(parseNetflixTitleArtwork('<meta property="og:image" content="https://example.com/not-netflix.jpg">')).toBeUndefined()
    expect(parseNetflixTitleArtwork('<meta property="og:image" content="http://occ-0-4452-2567.1.nflxso.net/title.jpg">')).toBeUndefined()
  })
})
