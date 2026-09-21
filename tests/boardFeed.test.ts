import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, h, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import type { FeedResult } from '../shared/utils/feed'

const source = vi.hoisted(() => ({ state: undefined as unknown }))

vi.mock('../app/composables/useBoardSource', () => ({
  useBoardSource: () => source.state,
}))

import BoardFeed from '../app/components/board/BoardFeed.vue'

const sampleFeed: FeedResult = {
  source: 'Example News',
  fetchedAt: '2026-09-21T00:00:00.000Z',
  articles: [{
    title: 'A recent article',
    source: 'Example News',
    link: 'https://example.org/article',
    date: '2026-09-21T00:00:00.000Z',
  }],
}

async function renderFeed(expanded = false) {
  return renderToString(createSSRApp(h(BoardFeed, {
    feedUrl: 'https://example.org/rss.xml',
    expanded,
  })))
}

describe('RSS feed states', () => {
  beforeEach(() => { source.state = undefined })

  it('announces the initial loading state', async () => {
    source.state = { value: ref(undefined), loading: ref(true), error: ref(undefined), refresh: vi.fn() }
    const html = await renderFeed()
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('Chargement des actualités…')
    expect(html).toContain('role="status"')
  })

  it('shows a dedicated message for a successful empty feed', async () => {
    source.state = { value: ref({ ...sampleFeed, articles: [] }), loading: ref(false), error: ref(undefined), refresh: vi.fn() }
    const html = await renderFeed()
    expect(html).toContain('Ce flux ne contient aucun article.')
    expect(html).not.toContain('role="alert"')
  })

  it('shows a retryable alert when the first request fails', async () => {
    source.state = { value: ref(undefined), loading: ref(false), error: ref(new Error('offline')), refresh: vi.fn() }
    const html = await renderFeed()
    expect(html).toContain('role="alert"')
    expect(html).toContain('Flux indisponible.')
    expect(html).toContain('Réessayer')
  })

  it('keeps the last articles visible and announces a failed refresh', async () => {
    source.state = { value: ref(sampleFeed), loading: ref(false), error: ref(new Error('offline')), refresh: vi.fn() }
    const html = await renderFeed(true)
    expect(html).toContain('A recent article')
    expect(html).toContain('Example News')
    expect(html).toContain('Actualisation impossible · derniers articles conservés.')
  })
})
