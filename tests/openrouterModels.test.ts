// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { normalizeOpenRouterModel, normalizeOpenRouterModels, normalizeOpenRouterThroughput, parseOpenRouterModelSortPreference, sortOpenRouterModels, type OpenRouterModel } from '../shared/utils/openrouterModels'

const model = (id: string, created: number, patch: Record<string, unknown> = {}) => ({
  id,
  name: `${id.split('/')[0]}: Model ${id.split('/')[1]}`,
  created,
  description: 'A new model.',
  context_length: 131072,
  architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] },
  pricing: { prompt: '0.00000435', completion: '0.0000087' },
  ...patch,
})

const sortableModel = (id: string, patch: Partial<OpenRouterModel> = {}): OpenRouterModel => ({
  id,
  name: id.split('/')[1] ?? id,
  provider: id.split('/')[0] ?? 'provider',
  description: '',
  createdAt: '2026-09-20T00:00:00.000Z',
  contextLength: 128000,
  inputPrice: 1,
  outputPrice: 2,
  throughput: 20,
  inputModalities: ['text'],
  outputModalities: ['text'],
  url: `https://openrouter.ai/${id}`,
  ...patch,
})

describe('OpenRouter model normalization', () => {
  it('normalizes model metadata and constructs a safe catalog URL', () => {
    expect(normalizeOpenRouterModel(model('openai/gpt-new', 1790021267))).toMatchObject({
      id: 'openai/gpt-new',
      name: 'Model gpt-new',
      provider: 'openai',
      createdAt: new Date(1790021267 * 1000).toISOString(),
      contextLength: 131072,
      inputPrice: 0.00000435,
      outputPrice: 0.0000087,
      inputModalities: ['text', 'image'],
      outputModalities: ['text'],
      url: 'https://openrouter.ai/openai/gpt-new',
    })
  })

  it('sorts newest models first and skips malformed records', () => {
    const result = normalizeOpenRouterModels({ data: [
      model('provider/older', 100),
      model('provider/newer', 200),
      model('../unsafe', 300),
      { id: 'provider/missing-name', created: 400 },
    ] })
    expect(result.map(item => item.id)).toEqual(['provider/newer', 'provider/older'])
  })

  it('handles missing optional architecture and pricing fields', () => {
    expect(normalizeOpenRouterModel(model('provider/basic', 100, { architecture: null, pricing: null }))).toMatchObject({
      contextLength: 131072,
      inputPrice: null,
      outputPrice: null,
      inputModalities: [],
      outputModalities: [],
      throughput: null,
    })
  })

  it('uses the median available provider p50 throughput', () => {
    expect(normalizeOpenRouterThroughput({ data: { endpoints: [
      { throughput_last_30m: { p50: 40 } },
      { throughput_last_30m: { p50: 100 } },
      { throughput_last_30m: { p50: 60 } },
      { throughput_last_30m: null },
    ] } })).toBe(60)
  })

  it('returns no throughput when provider metrics are unavailable', () => {
    expect(normalizeOpenRouterThroughput({ data: { endpoints: [{ throughput_last_30m: null }] } })).toBeNull()
    expect(normalizeOpenRouterThroughput({})).toBeNull()
  })
})

describe('OpenRouter model sorting', () => {
  const models = [
    sortableModel('provider/slow', { name: 'Slow', inputPrice: 2, throughput: 5, contextLength: 64000 }),
    sortableModel('provider/fast', { name: 'Fast', inputPrice: 0, throughput: 80, contextLength: 256000 }),
    sortableModel('provider/unmeasured', { name: 'Unmeasured', inputPrice: null, throughput: null, contextLength: 128000 }),
  ]

  it('sorts strings, numbers and prices in both directions without mutating the source', () => {
    expect(sortOpenRouterModels(models, 'name', 'asc').map(item => item.id)).toEqual(['provider/fast', 'provider/slow', 'provider/unmeasured'])
    expect(sortOpenRouterModels(models, 'contextLength', 'desc').map(item => item.id)).toEqual(['provider/fast', 'provider/unmeasured', 'provider/slow'])
    expect(sortOpenRouterModels(models, 'inputPrice', 'asc').map(item => item.id)).toEqual(['provider/fast', 'provider/slow', 'provider/unmeasured'])
    expect(sortOpenRouterModels(models, 'inputPrice', 'desc').map(item => item.id)).toEqual(['provider/slow', 'provider/fast', 'provider/unmeasured'])
    expect(models.map(item => item.id)).toEqual(['provider/slow', 'provider/fast', 'provider/unmeasured'])
  })

  it('keeps missing throughput measurements last in either direction', () => {
    expect(sortOpenRouterModels(models, 'throughput', 'asc').map(item => item.id)).toEqual(['provider/slow', 'provider/fast', 'provider/unmeasured'])
    expect(sortOpenRouterModels(models, 'throughput', 'desc').map(item => item.id)).toEqual(['provider/fast', 'provider/slow', 'provider/unmeasured'])
  })

  it('restores only valid persisted sort preferences', () => {
    expect(parseOpenRouterModelSortPreference({ key: 'throughput', direction: 'desc' })).toEqual({ key: 'throughput', direction: 'desc' })
    expect(parseOpenRouterModelSortPreference({ key: 'unknown', direction: 'asc' })).toBeNull()
    expect(parseOpenRouterModelSortPreference({ key: 'name', direction: 'sideways' })).toBeNull()
    expect(parseOpenRouterModelSortPreference(null)).toBeNull()
  })
})
