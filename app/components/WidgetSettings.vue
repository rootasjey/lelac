<template>
  <div class="modal-overlay">
    <div class="modal-backdrop" @click="emit('close')" />
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">
          Configure {{ widgetTitle }}
        </h3>
        <button class="modal-close" @click="emit('close')">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="field">
          <label class="field-label">Title</label>
          <input v-model="local.title" class="field-input" placeholder="Widget title" />
        </div>

        <template v-if="widget.type === 'weather'">
          <div class="field">
            <label class="field-label">City name</label>
            <div class="field-row">
              <input
                v-model="weatherQuery"
                class="field-input flex-1"
                placeholder="e.g. Paris, Tokyo, New York"
                @keydown.enter="geocodeCity"
              />
              <button class="field-btn" @click="geocodeCity" :disabled="geocoding">
                {{ geocoding ? '…' : 'Look up' }}
              </button>
            </div>
            <span v-if="geoError" class="field-hint field-hint-error">{{ geoError }}</span>
          </div>

          <div class="field">
            <label class="field-label">Coordinates</label>
            <div class="field-row">
              <input v-model.number="local.lat" class="field-input field-input-narrow" type="number" step="any" placeholder="Lat" />
              <input v-model.number="local.lon" class="field-input field-input-narrow" type="number" step="any" placeholder="Lon" />
            </div>
          </div>

          <div class="field">
            <label class="field-label">Country</label>
            <input v-model="local.locationCountry" class="field-input" placeholder="e.g. France" />
          </div>

          <div class="field-divider" />

          <button class="field-btn field-btn-full" @click="detectByIP" :disabled="detecting">
            {{ detecting ? 'Detecting…' : 'Auto-detect location' }}
          </button>
        </template>

        <template v-if="widget.type === 'clock'">
          <div class="field">
            <label class="field-label">Timezone</label>
            <input v-model="local.timezone" class="field-input" placeholder="e.g. Europe/Paris" />
            <span class="field-hint">Use IANA timezone format (e.g. America/New_York)</span>
          </div>
        </template>

        <template v-if="widget.type === 'rss'">
          <div class="field">
            <label class="field-label">Feed URL</label>
            <input v-model="local.feedUrl" class="field-input" placeholder="https://example.com/feed.xml" />
          </div>
        </template>

        <template v-if="widget.type === 'reddit'">
          <div class="field">
            <label class="field-label">Subreddit</label>
            <input v-model="local.subreddit" class="field-input" placeholder="e.g. selfhosted" />
          </div>
        </template>

        <template v-if="widget.type === 'markets'">
          <div class="field">
            <label class="field-label">Symbols</label>
            <input
              :value="arrayToComma(local.symbols)"
              @input="local.symbols = commaToArray(($event.target as HTMLInputElement).value)"
              class="field-input"
              placeholder="e.g. SPY, BTC-USD, NVDA"
            />
            <span class="field-hint">Comma-separated stock symbols</span>
          </div>
        </template>

        <template v-if="widget.type === 'releases'">
          <div class="field">
            <label class="field-label">Repositories</label>
            <input
              :value="arrayToComma(local.repos)"
              @input="local.repos = commaToArray(($event.target as HTMLInputElement).value)"
              class="field-input"
              placeholder="e.g. owner/repo, owner/repo"
            />
            <span class="field-hint">Comma-separated GitHub repos (owner/name)</span>
          </div>
        </template>

        <template v-if="widget.type === 'links'">
          <div class="field">
            <label class="field-label">Links are managed in the YAML config</label>
          </div>
        </template>
      </div>

      <div class="modal-footer">
        <button class="modal-btn modal-btn-primary" @click="save">
          Save
        </button>
        <button class="modal-btn" @click="emit('close')">
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WidgetConfig } from '~/types/config'

const props = defineProps<{
  widget: WidgetConfig
  columnIndex: number
  widgetIndex: number
}>()

const emit = defineEmits<{
  close: []
}>()

const store = useDashboardStore()

const local = reactive<Record<string, unknown>>({ ...props.widget })

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeyDown))
onUnmounted(() => document.removeEventListener('keydown', onKeyDown))
const weatherQuery = ref('')
const geocoding = ref(false)
const detecting = ref(false)
const geoError = ref('')

const widgetLabels: Record<string, string> = {
  calendar: 'Calendar', weather: 'Weather', clock: 'Clock', rss: 'RSS Feed',
  links: 'Quick Links', hn: 'Hacker News', reddit: 'Reddit', twitch: 'Twitch Channels',
  videos: 'Videos', markets: 'Markets', releases: 'Releases',
}

const widgetTitle = computed(() => widgetLabels[props.widget.type] ?? props.widget.type)

function arrayToComma(arr: unknown): string {
  return Array.isArray(arr) ? arr.join(', ') : ''
}

function commaToArray(str: string): string[] {
  return str.split(',').map(s => s.trim()).filter(Boolean)
}

async function geocodeCity() {
  const query = weatherQuery.value.trim()
  if (!query) return
  geocoding.value = true
  geoError.value = ''
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
    )
    if (!res.ok) throw new Error('Geocoding failed')
    const data = await res.json()
    if (!data.results?.length) {
      geoError.value = 'City not found'
      return
    }
    const result = data.results[0]
    local.lat = result.latitude
    local.lon = result.longitude
    local.locationName = result.name
    local.locationCountry = result.country ?? ''
  } catch (e) {
    geoError.value = e instanceof Error ? e.message : 'Lookup failed'
  } finally {
    geocoding.value = false
  }
}

async function detectByIP() {
  detecting.value = true
  geoError.value = ''
  try {
    const res = await fetch('https://ipapi.co/json/')
    if (!res.ok) throw new Error('IP detection failed')
    const data = await res.json()
    local.lat = data.latitude
    local.lon = data.longitude
    local.locationName = data.city ?? data.city ?? 'Unknown'
    local.locationCountry = data.country_name ?? ''
    weatherQuery.value = local.locationName as string
  } catch {
    // Fallback: browser Geolocation API
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      })
      local.lat = pos.coords.latitude
      local.lon = pos.coords.longitude
      local.locationName = `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`
      local.locationCountry = ''
      weatherQuery.value = local.locationName as string
    } catch {
      geoError.value = 'Could not detect location. Please enter city name or coordinates.'
    }
  } finally {
    detecting.value = false
  }
}

function save() {
  const updates: Record<string, unknown> = {}
  for (const key of Object.keys(local)) {
    if (key === 'type' || key === 'id') continue
    const val = local[key]
    if (val === '' || val === undefined || val === null) continue
    if (typeof val === 'number' && isNaN(val)) continue
    updates[key] = val
  }
  store.updateWidget(props.columnIndex, props.widgetIndex, updates)
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-backdrop {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.modal {
  position: relative;
  background-color: var(--widget-bg);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 28rem;
  margin: 0 1rem;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-primary);
}

.modal-title {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s;
}

.modal-close:hover {
  color: var(--text-primary);
  background-color: var(--bg-hover);
}

.modal-body {
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border-primary);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field-label {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.field-input {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.8125rem;
  padding: 0.5rem 0.625rem;
  border-radius: 4px;
  border: 1px solid var(--border-primary);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s;
}

.field-input:focus {
  border-color: var(--accent);
}

.field-input-narrow {
  flex: 1;
  min-width: 0;
}

.field-hint {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.625rem;
  color: var(--text-faint);
}

.field-hint-error {
  color: var(--negative);
}

.field-row {
  display: flex;
  gap: 0.5rem;
}

.flex-1 {
  flex: 1;
  min-width: 0;
}

.field-btn {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  border: 1px solid var(--border-primary);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.field-btn:hover:not(:disabled) {
  background-color: var(--bg-hover);
}

.field-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.field-btn-full {
  width: 100%;
  text-align: center;
  padding: 0.5rem;
  border-color: var(--accent);
  color: var(--accent);
  background: transparent;
}

.field-btn-full:hover:not(:disabled) {
  background-color: var(--accent);
  color: var(--accent-text);
}

.field-divider {
  height: 1px;
  background-color: var(--border-primary);
  margin: 0.25rem 0;
}

.modal-btn {
  font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  background-color: transparent;
  color: var(--text-muted);
}

.modal-btn:hover {
  color: var(--text-primary);
  background-color: var(--bg-hover);
}

.modal-btn-primary {
  background-color: var(--accent);
  color: var(--accent-text);
}

.modal-btn-primary:hover {
  opacity: 0.9;
}
</style>
