export interface OpenRouterModel {
  id: string
  name: string
  provider: string
  description: string
  createdAt: string
  contextLength: number
  inputPrice: number | null
  outputPrice: number | null
  throughput: number | null
  inputModalities: string[]
  outputModalities: string[]
  url: string
}

export interface OpenRouterModelsResult {
  models: OpenRouterModel[]
  source: string
  fetchedAt: string
  throughputEnabled: boolean
}

export type OpenRouterModelSortKey = 'name' | 'contextLength' | 'inputPrice' | 'outputPrice' | 'throughput' | 'createdAt'
export type OpenRouterModelSortDirection = 'asc' | 'desc'
export interface OpenRouterModelSortPreference {
  key: OpenRouterModelSortKey
  direction: OpenRouterModelSortDirection
}

const openRouterModelSortKeys = new Set<OpenRouterModelSortKey>(['name', 'contextLength', 'inputPrice', 'outputPrice', 'throughput', 'createdAt'])

export function parseOpenRouterModelSortPreference(value: unknown): OpenRouterModelSortPreference | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const preference = value as Record<string, unknown>
  if (!openRouterModelSortKeys.has(preference.key as OpenRouterModelSortKey)) return null
  if (preference.direction !== 'asc' && preference.direction !== 'desc') return null
  return { key: preference.key as OpenRouterModelSortKey, direction: preference.direction }
}

export function sortOpenRouterModels(
  models: OpenRouterModel[],
  key: OpenRouterModelSortKey,
  direction: OpenRouterModelSortDirection,
): OpenRouterModel[] {
  const order = direction === 'asc' ? 1 : -1
  return [...models].sort((left, right) => {
    let comparison = 0
    if (key === 'name') {
      comparison = left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' })
        || left.provider.localeCompare(right.provider, 'fr', { sensitivity: 'base' })
    } else if (key === 'contextLength') {
      comparison = left.contextLength - right.contextLength
    } else if (key === 'createdAt') {
      comparison = Date.parse(left.createdAt) - Date.parse(right.createdAt)
    } else {
      const first = left[key]
      const second = right[key]
      if (first === null || second === null) {
        if (first === null && second !== null) return 1
        if (second === null && first !== null) return -1
      } else {
        comparison = first - second
      }
    }

    return comparison === 0 ? left.id.localeCompare(right.id) : comparison * order
  })
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function nonNegativeNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function displayNameParts(id: string, name: string) {
  const idProvider = id.split('/')[0] ?? ''
  const separator = name.indexOf(':')
  if (separator > 0) {
    return { provider: name.slice(0, separator).trim(), name: name.slice(separator + 1).trim() || name }
  }
  return {
    provider: idProvider.replace(/[-_]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase()),
    name,
  }
}

export function normalizeOpenRouterModel(value: unknown): OpenRouterModel | null {
  const model = asRecord(value)
  if (!model || typeof model.id !== 'string' || !/^[a-z\d][a-z\d._-]*\/[a-z\d][a-z\d._:@-]*$/i.test(model.id)) return null
  if (typeof model.name !== 'string' || !model.name.trim()) return null
  if (typeof model.created !== 'number' || !Number.isSafeInteger(model.created) || model.created < 0) return null

  const createdAt = new Date(model.created * 1000)
  if (!Number.isFinite(createdAt.getTime())) return null

  const architecture = asRecord(model.architecture)
  const pricing = asRecord(model.pricing)
  const contextLength = nonNegativeNumber(model.context_length) ?? 0
  const inputPrice = nonNegativeNumber(pricing?.prompt)
  const outputPrice = nonNegativeNumber(pricing?.completion)
  const parts = displayNameParts(model.id, model.name.trim())
  const readModalities = (value: unknown) => Array.isArray(value)
    ? [...new Set(value.filter((modality): modality is string => typeof modality === 'string' && /^[a-z][a-z0-9_-]{0,19}$/i.test(modality)))]
    : []

  return {
    id: model.id,
    name: parts.name,
    provider: parts.provider,
    description: typeof model.description === 'string' ? model.description.trim() : '',
    createdAt: createdAt.toISOString(),
    contextLength,
    inputPrice,
    outputPrice,
    throughput: null,
    inputModalities: readModalities(architecture?.input_modalities),
    outputModalities: readModalities(architecture?.output_modalities),
    url: `https://openrouter.ai/${model.id}`,
  }
}

export function normalizeOpenRouterModels(value: unknown): OpenRouterModel[] {
  const payload = asRecord(value)
  if (!Array.isArray(payload?.data)) return []

  return payload.data
    .map(normalizeOpenRouterModel)
    .filter((model): model is OpenRouterModel => model !== null)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

/** Returns the median p50 throughput across OpenRouter providers, in tokens per second. */
export function normalizeOpenRouterThroughput(value: unknown): number | null {
  const payload = asRecord(value)
  const data = asRecord(payload?.data)
  const endpoints = Array.isArray(data?.endpoints)
    ? data.endpoints
    : Array.isArray(payload?.data)
      ? payload.data
      : []

  const measurements = endpoints
    .map((entry) => {
      const endpoint = asRecord(entry)
      const throughput = asRecord(endpoint?.throughput_last_30m)
      return nonNegativeNumber(throughput?.p50)
    })
    .filter((throughput): throughput is number => throughput !== null && throughput > 0)
    .sort((a, b) => a - b)

  if (!measurements.length) return null
  const middle = Math.floor(measurements.length / 2)
  return measurements.length % 2 ? measurements[middle]! : (measurements[middle - 1]! + measurements[middle]!) / 2
}
