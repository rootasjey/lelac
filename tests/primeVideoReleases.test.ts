// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { groupPrimeVideoSeasons, parsePrimeVideoReleaseCalendar } from '../shared/utils/primeVideoReleases'

describe('Prime Video France release calendar parser', () => {
  it('extracts dated French releases, offer labels, and Amazon artwork', () => {
    const html = `
      <main>
        <div class="release-card">
          <a href="/fr_fr/showDetails/B0GQDBJLF8" aria-label="Protector">
            <img alt="Protector" src="https://m.media-amazon.com/images/I/poster._UX300_.jpg">
          </a>
          <span>Protector</span><span>Included with Prime</span>
          <time>September 30, 2026</time><span>FR</span>
        </div>
        <div class="release-card">
          <a href="/fr_fr/showDetails/B0GQDBJLF9"><img alt="Tout Peut Arriver" src="/poster.jpg"></a>
          <span>Tout Peut Arriver</span><span>Inclus avec Prime</span>
          <time>2 octobre 2026</time><span>FR</span>
        </div>
      </main>`

    expect(parsePrimeVideoReleaseCalendar(html, new Date('2026-09-30T12:00:00Z'))).toEqual([
      {
        key: 'B0GQDBJLF8',
        title: 'Protector',
        offer: 'Included with Prime',
        dateLabel: '30 septembre 2026',
        dateSortKey: '2026-09-30',
        url: 'https://www.createprimevideo.amazon/fr_fr/showDetails/B0GQDBJLF8',
        imageUrl: 'https://m.media-amazon.com/images/I/poster._UX300_.jpg',
      },
      {
        key: 'B0GQDBJLF9',
        title: 'Tout Peut Arriver',
        offer: 'Inclus avec Prime',
        dateLabel: '2 octobre 2026',
        dateSortKey: '2026-10-02',
        url: 'https://www.createprimevideo.amazon/fr_fr/showDetails/B0GQDBJLF9',
      },
    ])
  })

  it('keeps a season number from the row when the link label omits it', () => {
    const html = `
      <div class="release-card">
        <a href="/fr_fr/showDetails/BALLERS5" aria-label="Ballers"><img alt="Ballers"></a>
        <span>Ballers Saison 5</span><span>Included with Prime</span>
        <time>September 30, 2026</time><span>FR</span>
      </div>`

    expect(parsePrimeVideoReleaseCalendar(html, new Date('2026-09-30T12:00:00Z')))
      .toMatchObject([{ title: 'Ballers · Saison 5' }])
  })

  it('groups consecutive seasons when the date and offer are identical', () => {
    const releases = [1, 2, 3, 5].map(season => ({
      key: `BALLERS${season}`,
      title: `Ballers · Saison ${season}`,
      offer: 'Included with Prime',
      dateLabel: '30 septembre 2026',
      dateSortKey: '2026-09-30',
      url: `https://www.createprimevideo.amazon/fr_fr/showDetails/BALLERS${season}`,
      imageUrl: 'https://m.media-amazon.com/images/I/ballers.jpg',
    }))

    expect(groupPrimeVideoSeasons(releases)).toEqual([{
      ...releases[0],
      key: 'BALLERS1:seasons-1-2-3-5',
      title: 'Ballers · Saisons 1–3, 5',
    }])
  })

  it('ignores past, non-French, and unsafe detail links and deduplicates by title ID', () => {
    const html = `
      <div><a href="/fr_fr/showDetails/OLD"><img alt="Old"></a><span>Rent</span><time>September 29, 2026</time><span>FR</span></div>
      <div><a href="/fr_fr/showDetails/US"><img alt="US title"></a><span>Included with Prime</span><time>October 2, 2026</time><span>US</span></div>
      <div><a href="https://example.com/fr_fr/showDetails/NO"><img alt="External"></a><span>Included with Prime</span><time>October 2, 2026</time><span>FR</span></div>
      <div><a href="/fr_fr/showDetails/NEW" aria-label="New"><img alt="New"></a><span>Buy</span><time>October 3, 2026</time><span>FR</span></div>
      <div><a href="/fr_fr/showDetails/NEW" aria-label="New"><img alt="New"></a><span>Buy</span><time>October 3, 2026</time><span>FR</span></div>`

    expect(parsePrimeVideoReleaseCalendar(html, new Date('2026-09-30T12:00:00Z'))).toMatchObject([
      { key: 'NEW', title: 'New', offer: 'Buy', dateSortKey: '2026-10-03' },
    ])
  })
})
