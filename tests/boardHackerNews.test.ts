import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, h, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'

const source = vi.hoisted(() => ({ state: undefined as unknown }))

vi.mock('../app/composables/useBoardSource', () => ({
  useBoardSource: () => source.state,
}))

import BoardHackerNews from '../app/components/board/BoardHackerNews.vue'

const sample = {
  source: 'Hacker News',
  fetchedAt: '2026-09-21T00:00:00.000Z',
  stories: [{
    id: 42,
    title: 'A technical story',
    url: 'https://example.org/story',
    source: 'example.org',
    points: 123,
    comments: 45,
    publishedAt: '2026-09-21T00:00:00.000Z',
  }],
}

async function renderWidget(expanded = false) {
  return renderToString(createSSRApp(h(BoardHackerNews, { expanded })))
}

describe('Hacker News widget states', () => {
  beforeEach(() => { source.state = undefined })

  it('announces loading', async () => {
    source.state = { value: ref(undefined), loading: ref(true), error: ref(undefined), refresh: vi.fn() }
    const html = await renderWidget()
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('Chargement de Hacker News…')
  })

  it('distinguishes an empty result', async () => {
    source.state = { value: ref({ ...sample, stories: [] }), loading: ref(false), error: ref(undefined), refresh: vi.fn() }
    expect(await renderWidget()).toContain('Aucune actualité à afficher.')
  })

  it('offers retry after an initial failure', async () => {
    source.state = { value: ref(undefined), loading: ref(false), error: ref(new Error('offline')), refresh: vi.fn() }
    const html = await renderWidget()
    expect(html).toContain('role="alert"')
    expect(html).toContain('Réessayer')
  })

  it('keeps stories visible after a failed refresh', async () => {
    source.state = { value: ref(sample), loading: ref(false), error: ref(new Error('offline')), refresh: vi.fn() }
    const html = await renderWidget(true)
    expect(html).toContain('A technical story')
    expect(html).toContain('Actualisation impossible · dernières actualités conservées.')
  })
})
