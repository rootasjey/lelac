<script setup lang="ts">
import { parseOpenRouterModelSortPreference, sortOpenRouterModels, type OpenRouterModel, type OpenRouterModelSortDirection, type OpenRouterModelSortKey, type OpenRouterModelsResult, type OpenRouterModelSortPreference } from '~~/shared/utils/openrouterModels'
import { useBoardVisibleItemCount } from '~/composables/useBoardVisibleItemCount'
import { useBoardSource } from '~/composables/useBoardSource'

const props = withDefaults(defineProps<{ expanded?: boolean; dashboardId?: string; widgetId?: string; sortScope?: 'widget' | 'drawer' }>(), { expanded: false, sortScope: 'widget' })
const body = ref<HTMLElement>()
const bodyWidth = ref(0)
const cardMeasurement = ref<HTMLElement>()
const tableMeasurement = ref<HTMLElement>()
const expanded = computed(() => props.expanded)
const isTableLayout = ref(false)
const { capacity: cardCapacity } = useBoardVisibleItemCount(body, cardMeasurement, expanded)
const { capacity: tableCapacity } = useBoardVisibleItemCount(body, tableMeasurement, expanded, 12)
const { value, loading, error, refresh } = useBoardSource<OpenRouterModelsResult>(
  'openrouter-models:newest:v2',
  () => $fetch<OpenRouterModelsResult>('/api/sources/openrouter-models'),
)
const models = computed(() => value.value?.models ?? [])
const sortKey = ref<OpenRouterModelSortKey>('createdAt')
const sortDirection = ref<OpenRouterModelSortDirection>('desc')
const sortReady = ref(false)
let activeSortStorageKey: string | null = null
const sortedModels = computed(() => sortOpenRouterModels(models.value, sortKey.value, sortDirection.value))
const sortStorageKey = computed(() => props.dashboardId && props.widgetId
  ? `encascade:openrouter-sort:v1:${encodeURIComponent(props.dashboardId)}:${encodeURIComponent(props.widgetId)}:${props.sortScope}`
  : null)
const showThroughputColumn = computed(() => isTableLayout.value && value.value?.throughputEnabled === true && bodyWidth.value >= 980)
const visibleModels = computed(() => {
  if (expanded.value) return sortedModels.value
  const capacity = isTableLayout.value ? tableCapacity.value : cardCapacity.value
  return sortedModels.value.slice(0, capacity)
})
const numberFormat = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 3 })
const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const relativeDateFormat = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' })
const unavailableProviderLogos = ref(new Set<string>())
const providerLogoBySlug: Record<string, string> = {
  amazon: 'amazon.png',
  anthropic: 'anthropic.svg',
  bytedance: 'bytedance-seed.png',
  'bytedance-seed': 'bytedance-seed.png',
  deepseek: 'deepseek.png',
  google: 'google-gemini.svg',
  'ibm-granite': 'ibm-granite.svg',
  inclusionai: 'inclusionai.png',
  inception: 'inception.svg',
  'inference-net': 'inference-net.png',
  meta: 'meta.png',
  microsoft: 'microsoft-mai.png',
  minimax: 'minimax.png',
  mistral: 'mistral.png',
  mistralai: 'mistral.png',
  moonshotai: 'moonshotai.png',
  'nex-agi': 'nex-agi.svg',
  nvidia: 'nvidia.png',
  openai: 'openai.svg',
  perplexity: 'perplexity.svg',
  'prism-ml': 'prism-ml.png',
  qwen: 'qwen.png',
  sakana: 'sakana.png',
  tencent: 'tencent.png',
  typesafe: 'typesafe.png',
  unbiased: 'unbiased.png',
  xiaomi: 'xiaomi.png',
  'x-ai': 'x-ai.png',
  'z-ai': 'z-ai.png',
}
let layoutObserver: ResizeObserver | undefined

function providerSlug(model: OpenRouterModel) {
  return model.id.split('/')[0]?.replace(/^~/, '').toLowerCase() ?? ''
}

function providerLogoSrc(model: OpenRouterModel) {
  const slug = providerSlug(model)
  const file = providerLogoBySlug[slug]
  return file && !unavailableProviderLogos.value.has(slug) ? `/images/provider-logos/${file}` : ''
}

function markProviderLogoUnavailable(model: OpenRouterModel) {
  unavailableProviderLogos.value = new Set([...unavailableProviderLogos.value, providerSlug(model)])
}

function providerInitials(provider: string) {
  const parts = provider.trim().split(/[\s._-]+/).filter(Boolean)
  return (parts.length > 1 ? parts.slice(0, 2).map(part => part[0]).join('') : provider.slice(0, 2)).toUpperCase()
}

function dateLabel(value: string) {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return 'Date inconnue'
  const days = Math.floor((Date.now() - timestamp) / 86_400_000)
  return days >= 0 && days < 7 ? relativeDateFormat.format(-days, 'day') : dateFormat.format(timestamp)
}

function contextLabel(value: number) {
  if (!value) return 'Non précisé'
  return new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function priceLabel(value: number | null) {
  if (value === null) return '—'
  if (value === 0) return 'Gratuit'
  return `$${numberFormat.format(value * 1_000_000)}`
}

function throughputLabel(value: number | null) {
  if (value === null || value <= 0) return '—'
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value)
}

function modalitiesLabel(model: OpenRouterModel) {
  const input = model.inputModalities.length ? model.inputModalities.join(' + ') : 'entrée variable'
  const output = model.outputModalities.length ? model.outputModalities.join(' + ') : 'sortie variable'
  return `${input} → ${output}`
}

function setSort(key: OpenRouterModelSortKey) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }
  sortKey.value = key
  sortDirection.value = 'asc'
}

function sortIndicator(key: OpenRouterModelSortKey) {
  if (sortKey.value !== key) return ''
  return sortDirection.value === 'asc' ? '↑' : '↓'
}

function ariaSort(key: OpenRouterModelSortKey) {
  return sortKey.value === key ? (sortDirection.value === 'asc' ? 'ascending' : 'descending') : undefined
}

function restoreSortPreference(storageKey: string | null) {
  sortReady.value = false
  activeSortStorageKey = storageKey
  let preference: OpenRouterModelSortPreference | null = null
  if (storageKey) {
    try {
      const stored = localStorage.getItem(storageKey)
      preference = stored ? parseOpenRouterModelSortPreference(JSON.parse(stored)) : null
    } catch {
      preference = null
    }
  }
  sortKey.value = preference?.key ?? 'createdAt'
  sortDirection.value = preference?.direction ?? 'desc'
  sortReady.value = true
}

function persistSortPreference() {
  if (!sortReady.value || !activeSortStorageKey) return
  try {
    localStorage.setItem(activeSortStorageKey, JSON.stringify({ key: sortKey.value, direction: sortDirection.value }))
  } catch {
    // Sorting remains usable when browser storage is unavailable or full.
  }
}

const modalityDefinitions: Record<string, { label: string, icon: string }> = {
  text: { label: 'Texte', icon: 'i-tabler-letter-t' },
  image: { label: 'Image', icon: 'i-tabler-photo' },
  audio: { label: 'Audio', icon: 'i-tabler-headphones' },
  video: { label: 'Vidéo', icon: 'i-tabler-video' },
  file: { label: 'Fichier', icon: 'i-tabler-file-text' },
  json: { label: 'JSON', icon: 'i-tabler-braces' },
  embeddings: { label: 'Vecteurs', icon: 'i-tabler-vector' },
}

function modalityItems(model: OpenRouterModel, direction: 'input' | 'output') {
  const modalities = direction === 'input' ? model.inputModalities : model.outputModalities
  return (modalities.length ? modalities : ['unknown']).map((modality) => {
    const definition = modalityDefinitions[modality.toLowerCase()]
    const label = definition?.label ?? (modality === 'unknown' ? 'Non précisé' : modality.replace(/[-_]+/g, ' '))
    return {
      key: modality,
      label: `${direction === 'input' ? 'Entrée' : 'Sortie'} : ${label}`,
      icon: definition?.icon ?? 'i-tabler-help-circle',
    }
  })
}

onMounted(() => {
  restoreSortPreference(sortStorageKey.value)
  layoutObserver = new ResizeObserver(([entry]) => {
    bodyWidth.value = entry?.contentRect.width ?? body.value?.clientWidth ?? 0
    isTableLayout.value = bodyWidth.value >= 700
  })
  if (body.value) layoutObserver.observe(body.value)
})

watch(sortStorageKey, (storageKey) => {
  if (import.meta.client && sortReady.value) restoreSortPreference(storageKey)
})
watch([sortKey, sortDirection], persistSortPreference)

onBeforeUnmount(() => layoutObserver?.disconnect())
</script>

<template>
  <div class="openrouter-models" :class="{ expanded, 'table-layout': isTableLayout }" :aria-busy="loading">
    <div ref="body" class="openrouter-models-body">
      <p v-if="loading && !models.length" class="model-state" role="status">Chargement des modèles récents…</p>
      <p v-else-if="error && !models.length" class="model-state model-error" role="alert">
        Catalogue OpenRouter indisponible. <button type="button" @click="refresh()">Réessayer</button>
      </p>
      <p v-else-if="!loading && !models.length" class="model-state">Aucun modèle récent à afficher.</p>
      <div v-else-if="isTableLayout" class="model-table-scroll">
        <table class="model-table" :class="{ 'with-throughput': showThroughputColumn }" aria-label="Comparaison des modèles récents">
          <thead>
            <tr>
              <th scope="col" :aria-sort="ariaSort('name')"><button type="button" class="model-sort-button" @click="setSort('name')">Modèle <span v-if="sortIndicator('name')" class="model-sort-indicator" aria-hidden="true">{{ sortIndicator('name') }}</span></button></th>
              <th scope="col" class="numeric-column" :aria-sort="ariaSort('contextLength')"><button type="button" class="model-sort-button" @click="setSort('contextLength')">Contexte <span v-if="sortIndicator('contextLength')" class="model-sort-indicator" aria-hidden="true">{{ sortIndicator('contextLength') }}</span></button></th>
              <th scope="col">Modalités</th>
              <th scope="col" class="numeric-column" :aria-sort="ariaSort('inputPrice')"><button type="button" class="model-sort-button" @click="setSort('inputPrice')"><span>Entrée</span><span v-if="sortIndicator('inputPrice')" class="model-sort-indicator" aria-hidden="true">{{ sortIndicator('inputPrice') }}</span><span class="model-sort-units">$/1 M</span></button></th>
              <th scope="col" class="numeric-column" :aria-sort="ariaSort('outputPrice')"><button type="button" class="model-sort-button" @click="setSort('outputPrice')"><span>Sortie</span><span v-if="sortIndicator('outputPrice')" class="model-sort-indicator" aria-hidden="true">{{ sortIndicator('outputPrice') }}</span><span class="model-sort-units">$/1 M</span></button></th>
              <th v-if="showThroughputColumn" scope="col" class="numeric-column" :aria-sort="ariaSort('throughput')">
                <NTooltip content="Médiane des mesures p50 fournies par OpenRouter sur les 30 dernières minutes.">
                  <button type="button" class="model-sort-button throughput-heading" @click="setSort('throughput')"><span>Débit</span><span v-if="sortIndicator('throughput')" class="model-sort-indicator" aria-hidden="true">{{ sortIndicator('throughput') }}</span><span class="model-sort-units">t/s · p50</span></button>
                </NTooltip>
              </th>
              <th scope="col" class="date-column" :aria-sort="ariaSort('createdAt')"><button type="button" class="model-sort-button" @click="setSort('createdAt')">Ajouté <span v-if="sortIndicator('createdAt')" class="model-sort-indicator" aria-hidden="true">{{ sortIndicator('createdAt') }}</span></button></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="model in visibleModels" :key="model.id" class="model-row">
              <th scope="row" class="model-cell">
                <div class="model-identity">
                  <img v-if="providerLogoSrc(model)" class="provider-mark" :src="providerLogoSrc(model)" alt="" aria-hidden="true" loading="lazy" decoding="async" @error="markProviderLogoUnavailable(model)">
                  <span v-else class="provider-mark provider-mark-fallback" aria-hidden="true">{{ providerInitials(model.provider) }}</span>
                  <div class="model-copy">
                    <span class="model-provider">{{ model.provider }}</span>
                    <NTooltip
                      :content="model.description || model.name"
                      :una="{ tooltipContent: 'max-w-80 whitespace-normal break-words' }"
                    >
                      <a class="model-name board-link-underline" :href="model.url" target="_blank" rel="noopener noreferrer">{{ model.name }}</a>
                    </NTooltip>
                  </div>
                </div>
              </th>
              <td class="numeric-column">{{ contextLabel(model.contextLength) }}</td>
              <td class="model-modalities">
                <div class="modality-groups" role="group" :aria-label="`Modalités : ${modalitiesLabel(model)}`">
                  <div class="modality-group">
                    <NTooltip v-for="item in modalityItems(model, 'input')" :key="`input-${item.key}`" :content="item.label">
                      <span class="modality-icon" :class="item.icon" role="img" tabindex="0" :aria-label="item.label" />
                    </NTooltip>
                  </div>
                  <span class="modality-direction" aria-hidden="true">→</span>
                  <div class="modality-group">
                    <NTooltip v-for="item in modalityItems(model, 'output')" :key="`output-${item.key}`" :content="item.label">
                      <span class="modality-icon" :class="item.icon" role="img" tabindex="0" :aria-label="item.label" />
                    </NTooltip>
                  </div>
                </div>
              </td>
              <td class="numeric-column">{{ priceLabel(model.inputPrice) }}</td>
              <td class="numeric-column">{{ priceLabel(model.outputPrice) }}</td>
              <td v-if="showThroughputColumn" class="numeric-column">{{ throughputLabel(model.throughput) }}</td>
              <td class="model-date date-column"><time :datetime="model.createdAt">{{ dateLabel(model.createdAt) }}</time></td>
            </tr>
          </tbody>
        </table>
      </div>
      <ul v-else class="model-grid">
        <li v-for="model in visibleModels" :key="model.id" class="model-card">
          <div class="model-heading">
            <div class="model-identity">
              <img v-if="providerLogoSrc(model)" class="provider-mark" :src="providerLogoSrc(model)" alt="" aria-hidden="true" loading="lazy" decoding="async" @error="markProviderLogoUnavailable(model)">
              <span v-else class="provider-mark provider-mark-fallback" aria-hidden="true">{{ providerInitials(model.provider) }}</span>
              <div class="model-heading-copy">
                <span class="model-provider">{{ model.provider }}</span>
                <h3>
                  <NTooltip
                    :content="model.description || model.name"
                    :una="{ tooltipContent: 'max-w-80 whitespace-normal break-words' }"
                  >
                    <a class="board-link-underline" :href="model.url" target="_blank" rel="noopener noreferrer">{{ model.name }}</a>
                  </NTooltip>
                </h3>
              </div>
            </div>
            <time class="model-date" :datetime="model.createdAt">{{ dateLabel(model.createdAt) }}</time>
          </div>
          <p class="model-context">{{ contextLabel(model.contextLength) }} tokens de contexte <span aria-hidden="true">·</span> {{ modalitiesLabel(model) }}</p>
          <p class="model-pricing">
            <span>Entrée {{ priceLabel(model.inputPrice) }}</span>
            <span>Sortie {{ priceLabel(model.outputPrice) }}</span>
            <span class="model-price-unit">/ 1 M tokens · USD</span>
          </p>
        </li>
      </ul>
      <ul v-if="!expanded && models.length" ref="cardMeasurement" class="model-grid model-measure card-measurement" aria-hidden="true" inert>
        <li v-for="model in sortedModels" :key="model.id" class="model-card">
          <div class="model-heading">
            <div class="model-identity">
              <img v-if="providerLogoSrc(model)" class="provider-mark" :src="providerLogoSrc(model)" alt="" aria-hidden="true" loading="lazy" decoding="async" @error="markProviderLogoUnavailable(model)">
              <span v-else class="provider-mark provider-mark-fallback" aria-hidden="true">{{ providerInitials(model.provider) }}</span>
              <div class="model-heading-copy">
                <span class="model-provider">{{ model.provider }}</span>
                <h3>{{ model.name }}</h3>
              </div>
            </div>
            <time class="model-date">{{ dateLabel(model.createdAt) }}</time>
          </div>
          <p class="model-context">{{ contextLabel(model.contextLength) }} tokens de contexte <span aria-hidden="true">·</span> {{ modalitiesLabel(model) }}</p>
          <p class="model-pricing"><span>Entrée {{ priceLabel(model.inputPrice) }}</span><span>Sortie {{ priceLabel(model.outputPrice) }}</span><span class="model-price-unit">/ 1 M tokens · USD</span></p>
        </li>
      </ul>
      <table v-if="!expanded && models.length" class="model-table model-measure table-measurement" :class="{ 'with-throughput': showThroughputColumn }" aria-hidden="true" inert>
        <thead>
          <tr>
            <th scope="col"><span class="model-sort-button">Modèle <span v-if="sortIndicator('name')" class="model-sort-indicator">{{ sortIndicator('name') }}</span></span></th>
            <th scope="col" class="numeric-column"><span class="model-sort-button">Contexte <span v-if="sortIndicator('contextLength')" class="model-sort-indicator">{{ sortIndicator('contextLength') }}</span></span></th>
            <th scope="col">Modalités</th>
            <th scope="col" class="numeric-column"><span class="model-sort-button"><span>Entrée</span><span v-if="sortIndicator('inputPrice')" class="model-sort-indicator">{{ sortIndicator('inputPrice') }}</span><span class="model-sort-units">$/1 M</span></span></th>
            <th scope="col" class="numeric-column"><span class="model-sort-button"><span>Sortie</span><span v-if="sortIndicator('outputPrice')" class="model-sort-indicator">{{ sortIndicator('outputPrice') }}</span><span class="model-sort-units">$/1 M</span></span></th>
            <th v-if="showThroughputColumn" scope="col" class="numeric-column"><span class="model-sort-button"><span>Débit</span><span v-if="sortIndicator('throughput')" class="model-sort-indicator">{{ sortIndicator('throughput') }}</span><span class="model-sort-units">t/s · p50</span></span></th>
            <th scope="col" class="date-column"><span class="model-sort-button">Ajouté <span v-if="sortIndicator('createdAt')" class="model-sort-indicator">{{ sortIndicator('createdAt') }}</span></span></th>
          </tr>
        </thead>
        <tbody ref="tableMeasurement">
          <tr v-for="model in sortedModels" :key="model.id" class="model-row">
            <th scope="row" class="model-cell">
              <div class="model-identity">
                <img v-if="providerLogoSrc(model)" class="provider-mark" :src="providerLogoSrc(model)" alt="" aria-hidden="true" loading="lazy" decoding="async" @error="markProviderLogoUnavailable(model)">
                  <span v-else class="provider-mark provider-mark-fallback" aria-hidden="true">{{ providerInitials(model.provider) }}</span>
                <div class="model-copy">
                  <span class="model-provider">{{ model.provider }}</span><span class="model-name">{{ model.name }}</span>
                </div>
              </div>
            </th>
            <td class="numeric-column">{{ contextLabel(model.contextLength) }}</td>
            <td class="model-modalities">{{ modalitiesLabel(model) }}</td>
            <td class="numeric-column">{{ priceLabel(model.inputPrice) }}</td><td class="numeric-column">{{ priceLabel(model.outputPrice) }}</td>
            <td v-if="showThroughputColumn" class="numeric-column">{{ throughputLabel(model.throughput) }}</td>
            <td class="model-date date-column"><time>{{ dateLabel(model.createdAt) }}</time></td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="error && models.length" class="model-stale" role="status">Actualisation impossible · les derniers modèles sont conservés.</p>
  </div>
</template>

<style scoped>
.openrouter-models { height: 100%; min-height: 0; display: flex; flex-direction: column; }
.openrouter-models-body { position: relative; flex: 1; min-height: 0; overflow: hidden; container-type: inline-size; }
.model-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr)); align-content: start; gap: 10px; list-style: none; margin: 0; padding: 0 0 8px; }
.model-card { display: flex; min-width: 0; flex-direction: column; gap: 7px; overflow: hidden; border: 1px solid #303036; border-radius: 6px; background: #1a191f; padding: 11px 12px; }
.model-heading { display: flex; min-width: 0; align-items: flex-start; justify-content: space-between; gap: 8px; }
.model-heading-copy, .model-copy { min-width: 0; }
.model-identity { display: flex; min-width: 0; align-items: center; gap: 8px; }
.provider-mark { display: block; width: 18px; height: 18px; flex: 0 0 18px; object-fit: contain; }
.provider-mark-fallback { display: grid; place-items: center; border: 1px solid #3b3942; border-radius: 4px; background: #24221f; color: #d8c58f; font-size: 8px; font-weight: 600; letter-spacing: .02em; line-height: 1; }
.model-provider { display: block; overflow: hidden; color: #85838d; font-size: 9px; letter-spacing: .08em; line-height: 13px; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
h3 { display: -webkit-box; overflow: hidden; margin: 2px 0 0; color: #e2e0e7; font-size: 14px; font-weight: 500; line-height: 19px; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
h3 a { color: inherit; }
h3 a:focus-visible, .model-name:focus-visible { outline: 2px solid #d8c58f; outline-offset: 2px; }
.model-date { flex: 0 0 auto; padding-top: 1px; color: #aaa7b2; font-size: 10px; line-height: 14px; white-space: nowrap; }
.model-context { overflow: hidden; margin: 0; color: #85838d; font-size: 9px; line-height: 13px; text-overflow: ellipsis; white-space: nowrap; }
.model-pricing { display: flex; flex-wrap: wrap; gap: 3px 8px; margin: 0; color: #bdb8c5; font-size: 9px; line-height: 13px; }
.model-price-unit { color: #85838d; }
.model-measure { position: absolute; inset: 0 auto auto 0; visibility: hidden; pointer-events: none; }
.model-state { margin: 0; padding: 18px 0; color: #aaa7b2; font-size: 11px; line-height: 1.6; }
.model-state button { min-height: 40px; margin-left: 4px; border: 0; background: none; color: #d8c58f; font: inherit; cursor: pointer; }
.model-error { color: #e6a19c; }
.model-stale { flex: 0 0 auto; margin: 0; padding: 4px 0; color: #d8c58f; font-size: 10px; }
.model-table-scroll { box-sizing: border-box; width: 100%; height: 100%; min-height: 0; overflow: hidden; padding: 12px 16px; }
.expanded .model-table-scroll { height: auto; overflow: visible; padding: 0; }
.model-table { width: 100%; border-collapse: collapse; table-layout: fixed; color: #bdb8c5; font-size: 10px; line-height: 14px; }
.model-table th, .model-table td { min-width: 0; border-bottom: 1px solid #303036; padding: 8px 10px; text-align: left; vertical-align: middle; }
.model-table thead th { padding-top: 0; padding-bottom: 9px; color: #85838d; font-size: 9px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase; }
.expanded .model-table thead th { position: sticky; z-index: 1; top: 0; background: #1a191f; }
.model-sort-button { display: inline-grid; grid-template-columns: auto auto; align-items: center; gap: 0 4px; border: 0; padding: 0; background: transparent; color: inherit; font: inherit; letter-spacing: inherit; text-align: inherit; text-transform: inherit; cursor: pointer; }
.model-sort-button:hover, .model-sort-button:focus-visible { color: #d8c58f; }
.model-sort-button:focus-visible { outline: 1px solid #d8c58f; outline-offset: 3px; }
.model-table th.numeric-column .model-sort-button, .model-table th.date-column .model-sort-button { width: 100%; justify-content: end; justify-items: end; }
.model-sort-indicator { color: #d8c58f; font-size: 10px; line-height: 1; }
.model-sort-units { grid-column: 1 / -1; display: block; color: #706e77; font-size: 8px; font-weight: 400; letter-spacing: 0; text-transform: none; }
.model-table tbody tr:hover, .model-table tbody tr:focus-within { background: #24221f; }
.model-table tbody tr:hover .model-name, .model-table tbody tr:focus-within .model-name { color: #d8c58f; }
.model-table th:first-child { width: 32%; }
.model-table th:nth-child(2) { width: 13%; }
.model-table th:nth-child(3) { width: 19%; }
.model-table th:nth-child(4), .model-table th:nth-child(5) { width: 12%; }
.model-table th:nth-child(6) { width: 12%; }
.model-table.with-throughput th:first-child { width: 28%; }
.model-table.with-throughput th:nth-child(2) { width: 11%; }
.model-table.with-throughput th:nth-child(3) { width: 16%; }
.model-table.with-throughput th:nth-child(4), .model-table.with-throughput th:nth-child(5) { width: 10%; }
.model-table.with-throughput th:nth-child(6) { width: 13%; }
.model-table.with-throughput th:nth-child(7) { width: 12%; }
.model-table .numeric-column { text-align: right; white-space: nowrap; }
.model-table .date-column { text-align: right; }
.throughput-heading { cursor: pointer; }
.model-cell { font-weight: 400; }
.model-name { display: block; overflow: hidden; color: #dedbe3; font-size: 11px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
a.model-name { color: #dedbe3; text-decoration: none; }
.model-modalities { overflow: hidden; color: #aaa7b2; white-space: nowrap; }
.modality-groups, .modality-group { display: inline-flex; align-items: center; gap: 5px; }
.modality-direction { color: #706e77; font-size: 10px; }
.modality-icon { width: 14px; height: 14px; color: #bdb8c5; outline-offset: 2px; }
.modality-icon:focus-visible { border-radius: 2px; outline: 1px solid #d8c58f; }
.table-measurement { top: 12px; left: 16px; width: calc(100% - 32px); }
.card-measurement { top: 0; left: 0; width: 100%; }
.expanded { height: auto; }
.expanded .openrouter-models-body { overflow: visible; container-type: normal; }
.expanded .model-measure { display: none; }
.model-state, .model-stale { padding-inline: 2px; }
@media (max-width: 520px) { .model-grid { grid-template-columns: minmax(0, 1fr); } }
</style>
