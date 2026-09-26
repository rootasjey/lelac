import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, h, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'

const source = vi.hoisted(() => ({ state: undefined as unknown }))

vi.mock('../app/composables/useBoardSource', () => ({
  useBoardSource: () => source.state,
}))

vi.mock('../app/composables/useBoardVisibleItemCount', () => ({
  useBoardVisibleItemCount: () => ({ capacity: ref(0) }),
}))

import BoardOpenRouterModels from '../app/components/board/BoardOpenRouterModels.vue'

const sample = {
  source: 'OpenRouter',
  fetchedAt: '2026-09-22T00:00:00.000Z',
  throughputEnabled: true,
  models: [{
    id: 'openai/model-x',
    name: 'Model X',
    provider: 'OpenAI',
    description: 'A recent text and image model.',
    createdAt: '2026-09-21T00:00:00.000Z',
    contextLength: 128000,
    inputPrice: 0.000001,
    outputPrice: 0.000002,
    throughput: 57.5,
    inputModalities: ['text', 'image'],
    outputModalities: ['text'],
    url: 'https://openrouter.ai/openai/model-x',
  }],
}

async function renderWidget(expanded = false) {
  return renderToString(createSSRApp(h(BoardOpenRouterModels, { expanded })))
}

describe('OpenRouter models widget states', () => {
  beforeEach(() => { source.state = undefined })

  it('announces loading', async () => {
    source.state = { value: ref(undefined), loading: ref(true), error: ref(undefined), refresh: vi.fn() }
    const html = await renderWidget()
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('Chargement des modèles récents…')
  })

  it('shows recent models in the expanded list', async () => {
    source.state = { value: ref(sample), loading: ref(false), error: ref(undefined), refresh: vi.fn() }
    const html = await renderWidget(true)
    expect(html).toContain('Model X')
    expect(html).toContain('src="/images/provider-logos/openai.svg"')
    expect(html).toContain('https://openrouter.ai/openai/model-x')
    expect(html).toContain('tokens de contexte')
    expect(html).toContain('Entrée $1')
    expect(html).toContain('Sortie $2')
  })

  it('uses a locally stored OpenRouter logo for Qwen models', async () => {
    const qwen = { ...sample.models[0], id: 'qwen/qwen3-next', name: 'Qwen3 Next', provider: 'Qwen' }
    source.state = { value: ref({ ...sample, models: [qwen] }), loading: ref(false), error: ref(undefined), refresh: vi.fn() }
    const html = await renderWidget(true)
    expect(html).toContain('src="/images/provider-logos/qwen.png"')
    expect(html).toContain('Qwen3 Next')
  })


  it('uses provider initials when no local logo is mapped', async () => {
    source.state = {
      value: ref({ ...sample, models: [{ ...sample.models[0], id: 'unknown/model-y', provider: 'Unknown Provider', name: 'Model Y' }] }),
      loading: ref(false),
      error: ref(undefined),
      refresh: vi.fn(),
    }
    const html = await renderWidget(true)
    expect(html).toContain('provider-mark-fallback')
    expect(html).toContain('UP')
  })

  it('offers retry after an initial failure', async () => {
    source.state = { value: ref(undefined), loading: ref(false), error: ref(new Error('offline')), refresh: vi.fn() }
    const html = await renderWidget()
    expect(html).toContain('role="alert"')
    expect(html).toContain('Réessayer')
  })

  it('keeps cached models visible after a failed refresh', async () => {
    source.state = { value: ref(sample), loading: ref(false), error: ref(new Error('offline')), refresh: vi.fn() }
    const html = await renderWidget(true)
    expect(html).toContain('Model X')
    expect(html).toContain('les derniers modèles sont conservés')
  })
})
