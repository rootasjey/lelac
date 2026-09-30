// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parseDisneyPlusAnnouncements, parseDisneyPlusArticleDescription } from '../shared/utils/disneyPlusAnnouncements'

const today = new Date('2026-09-30T12:00:00Z')

function card({ title, date, slug, image = 'https://storage.googleapis.com/endurance-apps-liip/media/cache/disney_publication_card_grid_fs/poster', category }: { title: string; date: string; slug: string; image?: string; category?: 'films' | 'séries' }) {
  return `<div class="card card--topic card--default">
    <a class="card-img" href="//newsroom.disney.fr/actualites/${slug}.html"><img src="${image}" alt="Visuel"></a>
    <div class="card-block"><p class="card-subtitle"><span class="card-subtitle-date">${date}</span></p>
    <h3 class="card-title"><a href="//newsroom.disney.fr/actualites/${slug}.html" title="${title}">${title}</a></h3>
    <a class="label label--tags" href="//newsroom.disney.fr/disney+.html">Disney+</a>${category ? `<a class="label label--tags" href="//newsroom.disney.fr/${category}.html">${category}</a>` : ''}</div>
  </div>`
}

describe('Disney+ France announcements parser', () => {
  it('extracts upcoming releases, dates, titles, and official card artwork', () => {
    const html = `<main>${card({ title: 'OASIS : DON’T LOOK BACK IN ANGER | LE FILM ARRIVERA LE 9 OCTOBRE SUR DISNEY+', date: '28 septembre 2026', slug: 'oasis', category: 'films' })}${card({ title: '« L’IMPÉRATRICE REMARIÉE » I ARRIVE LE 4 NOVEMBRE SUR DISNEY+', date: '27 août 2026', slug: 'imperatrice', category: 'séries' })}${card({ title: 'FOOD SAMOURAÏ | LA NOUVELLE SÉRIE DOCUMENTAIRE ARRIVERA LE 12 OCTOBRE', date: '28 septembre 2026', slug: 'food', category: 'séries' })}</main>`
    expect(parseDisneyPlusAnnouncements(html, today)).toMatchObject([
      { title: 'OASIS : DON’T LOOK BACK IN ANGER', dateSortKey: '2026-10-09', kind: 'Film', url: 'https://newsroom.disney.fr/actualites/oasis.html', imageUrl: 'https://storage.googleapis.com/endurance-apps-liip/media/cache/disney_publication_card_grid_fs/poster' },
      { title: 'FOOD SAMOURAÏ', dateSortKey: '2026-10-12', kind: 'Série' },
      { title: 'L’IMPÉRATRICE REMARIÉE', dateSortKey: '2026-11-04', kind: 'Série' },
    ])
  })

  it('omits undated, expired, and stale entries while tolerating a missing artwork URL', () => {
    const html = `<main>
      ${card({ title: 'Disponible prochainement sur Disney+', date: '29 septembre 2026', slug: 'undated' })}
      ${card({ title: 'Arrive le 2 septembre sur Disney+', date: '28 août 2026', slug: 'past' })}
      ${card({ title: 'Arrive le 10 octobre sur Disney+', date: '1 janvier 2026', slug: 'stale' })}
    </main>`
    expect(parseDisneyPlusAnnouncements(html, today)).toEqual([])

    const unsafeImage = parseDisneyPlusAnnouncements(`<main>${card({ title: 'Arrive le 10 octobre sur Disney+', date: '28 septembre 2026', slug: 'valid', image: 'https://example.com/poster' })}</main>`, today)
    expect(unsafeImage).toMatchObject([{ dateSortKey: '2026-10-10' }])
    expect(unsafeImage[0]?.imageUrl).toBeUndefined()
  })

  it('extracts a brief official article description from Open Graph metadata', () => {
    expect(parseDisneyPlusArticleDescription('<meta property="og:description" content="PARIS, France – Un nouveau film arrive sur Disney+… - Newsroom Walt Disney Company France">'))
      .toBe('PARIS, France – Un nouveau film arrive sur Disney+…')
  })
})
