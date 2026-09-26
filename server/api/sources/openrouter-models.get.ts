import { normalizeOpenRouterModels, normalizeOpenRouterThroughput, type OpenRouterModelsResult } from '../../../shared/utils/openrouterModels'

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models?sort=newest&limit=60'
const FETCH_TIMEOUT_MS = 12_000

export default defineCachedEventHandler(async (event) => {
  try {
    const response = await fetch(OPENROUTER_MODELS_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Encascade OpenRouter models widget',
      },
    })
    if (!response.ok) throw new Error(`OpenRouter responded with status ${response.status}`)

    const models = normalizeOpenRouterModels(await response.json())
    if (!models.length) throw new Error('OpenRouter returned no valid models')

    const apiKey = useRuntimeConfig(event).openrouterApiKey
    if (apiKey) {
      // Keep the optional enrichment bounded: newer models are the ones users
      // see first, and each request is cached with the catalog response.
      const modelsToEnrich = models.slice(0, 12)
      const throughputValues = await Promise.all(modelsToEnrich.map(async (model) => {
        const [author, slug] = model.id.split('/')
        if (!author || !slug) return [model.id, null] as const

        try {
          const endpointResponse = await fetch(`https://openrouter.ai/api/v1/models/${encodeURIComponent(author)}/${encodeURIComponent(slug)}/endpoints`, {
            signal: AbortSignal.timeout(5_000),
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${apiKey}`,
              'User-Agent': 'Encascade OpenRouter models widget',
            },
          })
          if (!endpointResponse.ok) return [model.id, null] as const
          return [model.id, normalizeOpenRouterThroughput(await endpointResponse.json())] as const
        } catch {
          return [model.id, null] as const
        }
      }))
      const throughputByModel = new Map(throughputValues)
      for (const model of models) model.throughput = throughputByModel.get(model.id) ?? null
    }

    const result: OpenRouterModelsResult = {
      models,
      source: 'OpenRouter',
      fetchedAt: new Date().toISOString(),
      throughputEnabled: Boolean(apiKey),
    }
    return result
  } catch (cause) {
    const status = cause instanceof Error ? cause.message.match(/status (\d+)/)?.[1] : undefined
    throw createError({
      statusCode: 502,
      statusMessage: status ? `OpenRouter a répondu avec HTTP ${status}.` : 'Le catalogue OpenRouter est indisponible.',
    })
  }
}, {
  // Invalidate the earlier catalog cache that did not include endpoint metrics.
  getKey: () => 'openrouter-models-v2',
  maxAge: 900,
  swr: true,
})
