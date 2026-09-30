// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parseAppleTvReleaseCalendar } from '../shared/utils/appleTvReleases'

describe('Apple TV Press France release calendar parser', () => {
  const today = new Date('2026-09-30T12:00:00.000Z')

  it('extracts official upcoming Apple Originals, native artwork and sorts by release date', () => {
    const payload = {
      results: {
        originals: [
          {
            title: 'Warrior Kid',
            url: '/fr/tv-pr/originals/warrior-kid/',
            showType: 'films',
            showTypeKey: 'films',
            releaseDateDisplayString: '25 novembre 2026',
            releaseDateISOString: '2026-11-25T00:00:00.000Z',
            image: {
              name: 'Apple_TV_Warrior_Kid_key_art_main_16_9.jpg',
              type: 'jpg',
              dirpath: '/fr/tv-pr/shows-and-films/w/warrior-kid/images/thumbnail/key-art-01/',
            },
          },
          {
            title: 'Nocturne',
            url: '/fr/tv-pr/originals/nocturne/',
            showType: 'séries',
            showTypeKey: 'series',
            releaseDateDisplayString: '30 octobre 2026',
            releaseDateISOString: '2026-10-30T00:00:00.000Z',
            image: {
              name: 'Apple_TV_Nocturne_key_art_main_16_9.jpg',
              type: 'jpg',
              dirpath: '/tv-pr/shows-and-films/n/nocturne/images/thumbnail/key-art-01/',
            },
          },
          {
            title: 'Portée disparue',
            url: '/fr/tv-pr/originals/last-seen/',
            showType: 'séries',
            showTypeKey: 'series',
            releaseDateDisplayString: '9 septembre 2026',
            releaseDateISOString: '2026-09-09T00:00:00.000Z',
          },
          {
            title: 'F1 le film',
            url: '/fr/tv-pr/originals/f1/',
            showType: 'films',
            showTypeKey: 'films',
          },
          {
            title: 'External',
            url: 'https://example.com/fr/tv-pr/originals/external/',
            showType: 'films',
            showTypeKey: 'films',
            releaseDateDisplayString: '2 décembre 2026',
            releaseDateISOString: '2026-12-02T00:00:00.000Z',
          },
        ],
      },
    }

    expect(parseAppleTvReleaseCalendar(payload, today)).toEqual([
      {
        key: 'nocturne',
        title: 'Nocturne',
        kind: 'Série',
        dateLabel: '30 octobre 2026',
        dateSortKey: '2026-10-30',
        url: 'https://www.apple.com/fr/tv-pr/originals/nocturne/',
        imageUrl: 'https://www.apple.com/tv-pr/shows-and-films/n/nocturne/images/thumbnail/key-art-01/Apple_TV_Nocturne_key_art_main_16_9.jpg.large.jpg',
      },
      {
        key: 'warrior-kid',
        title: 'Warrior Kid',
        kind: 'Film',
        dateLabel: '25 novembre 2026',
        dateSortKey: '2026-11-25',
        url: 'https://www.apple.com/fr/tv-pr/originals/warrior-kid/',
        imageUrl: 'https://www.apple.com/fr/tv-pr/shows-and-films/w/warrior-kid/images/thumbnail/key-art-01/Apple_TV_Warrior_Kid_key_art_main_16_9.jpg.large.jpg',
      },
    ])
  })

  it('supports year-only dates and omits external image hosts', () => {
    const payload = {
      results: {
        originals: [{
          title: 'Snoopy Unleashed',
          url: '/tv-pr/originals/snoopy-unleashed/',
          showType: 'films',
          showTypeKey: 'films',
          releaseDateDisplayString: '2027',
          releaseDateISOString: '2027-01-01T00:00:00.000Z',
          image: { name: 'poster.jpg', type: 'jpg', dirpath: 'https://example.com/images/' },
        }],
      },
    }

    expect(parseAppleTvReleaseCalendar(payload, today)).toMatchObject([
      { key: 'snoopy-unleashed', dateLabel: '2027', dateSortKey: '2027-01-01', url: 'https://www.apple.com/tv-pr/originals/snoopy-unleashed/' },
    ])
    expect(parseAppleTvReleaseCalendar(payload, today)[0]).not.toHaveProperty('imageUrl')
    expect(parseAppleTvReleaseCalendar({ results: { originals: 'not-an-array' } }, today)).toEqual([])
  })
})
