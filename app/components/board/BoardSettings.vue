<template>
  <NDialog v-model:open="open" @update:open="handleOpenChange">
    <NDialogContent
      class="settings-dialog-content"
      :_dialog-overlay="{ class: 'settings-dialog-overlay' }"
      :show-close="false"
      @open-auto-focus="focusDialogTitle"
      @keydown.capture="handleDialogKeydown"
    >
      <NDialogHeader :una="{ dialogHeader: 'flex-row items-center justify-between gap-3' }" class="settings-dialog-header">
        <NDialogTitle id="settings-title">{{ isNew ? 'Ajouter un widget' : 'Réglages du widget' }}</NDialogTitle>
        <NTooltip content="Fermer">
          <NButton
            type="button"
            icon
            label="i-ph-x-bold"
            btn="ghost"
            class="dialog-close-button"
            aria-label="Fermer les réglages"
            @click="close"
          />
        </NTooltip>
      </NDialogHeader>
      <NDialogDescription class="sr-only">Configurez le contenu de ce widget.</NDialogDescription>
      <form @submit.prevent="save">
      <label class="settings-title-field">
        Titre
        <input ref="titleInput" v-model="draft.title" maxlength="100" required />
      </label>
      <template v-if="draft.type === 'rss'">
        <section class="widget-settings-section">
          <label>
            Adresse du flux RSS
            <input v-model="draft.feedUrl" type="url" required placeholder="https://exemple.fr/feed.xml" />
          </label>
          <p class="field-hint">Flux RSS ou Atom public en HTTPS.</p>
        </section>
      </template>

      <template v-if="draft.type === 'youtube'">
        <section class="widget-settings-section">
          <label>
            Chaîne YouTube
            <input v-model="youtubeChannelInput" required placeholder="ID UC… ou URL youtube.com/@handle" autocomplete="off" spellcheck="false" />
          </label>
          <p class="field-hint">Collez l’URL d’une chaîne YouTube ou saisissez son ID UC… ; les URL @handle sont converties automatiquement.</p>
          <div class="youtube-grayscale-setting">
            <label for="youtube-grayscale">Miniatures en niveaux de gris</label>
            <NSwitch id="youtube-grayscale" v-model="draft.grayscale" size="sm" />
          </div>
          <p class="field-hint youtube-grayscale-hint">Applique un filtre noir et blanc aux miniatures.</p>
        </section>
      </template>

      <template v-if="draft.type === 'github-trending' || draft.type === 'github-developers-trending'">
        <section class="widget-settings-section github-trending-settings">
          <label>
            Période
            <select v-model="draft.githubPeriod">
              <option value="daily">Aujourd’hui</option>
              <option value="weekly">Cette semaine</option>
              <option value="monthly">Ce mois-ci</option>
            </select>
          </label>
          <label>
            Langage
            <input v-model="githubLanguageInput" placeholder="Tous les langages, Python, Rust…" autocomplete="off" />
          </label>
          <p class="field-hint">{{ draft.type === 'github-developers-trending' ? 'Le widget reprend le classement public des développeurs GitHub Trending.' : 'Le widget reprend le classement public GitHub Trending avec les étoiles gagnées sur la période.' }}</p>
        </section>
      </template>

      <template v-if="draft.type === 'weather'">
        <section class="widget-settings-section weather-settings">
          <label>
            Rechercher une ville
            <div class="search-row">
              <input
                v-model="query"
                placeholder="Paris, Lyon, Tokyo…"
                @keydown.enter.prevent="query.trim().length >= 2 && searchCities()"
              />
              <button type="button" :disabled="query.trim().length < 2 || searching" @click="searchCities">
                {{ searching ? 'Recherche…' : 'Chercher' }}
              </button>
            </div>
          </label>
          <p class="selected-location"><span>Lieu actuel</span><strong>{{ draft.location?.name }}</strong></p>
          <p v-if="cityError" role="status">{{ cityError }}</p>
          <ul class="city-results">
            <li v-for="city in results" :key="city.id">
              <button
                type="button"
                @click="draft.location = { name: city.name, lat: city.lat, lon: city.lon }; results = []"
              >
                {{ city.name }}
              </button>
            </li>
          </ul>
        </section>
      </template>
      <template v-if="draft.type === 'cinema'">
        <section class="widget-settings-section cinema-settings">
          <label for="cinema-location">Commune</label>
          <NCombobox
            id="cinema-location"
            :model-value="selectedCinemaOption"
            :items="cinemaOptions"
            by="inseeCode"
            label-key="name"
            value-key="inseeCode"
            :ignore-filter="true"
            :_combobox-list="{ class: 'cinema-combobox-list', align: 'start', position: 'popper' }"
            :_combobox-viewport="{ class: 'max-h-60 overflow-y-auto' }"
            text-empty="Aucune commune trouvée."
            @update:model-value="selectCinemaLocation"
          >
            <template #input-wrapper>
              <NComboboxInput
                v-model="cinemaQuery"
                :display-value="cinemaInputDisplayValue"
                class="cinema-location-input"
                placeholder="Rechercher une commune…"
                autocomplete="off"
                autofocus
              />
            </template>
            <template #item="{ item }">
              <span class="cinema-location-option"><span>{{ item.name }}</span><small>{{ item.department }}</small></span>
            </template>
            <template #empty>
              <span v-if="cinemaSearchPending">Recherche des communes…</span>
              <span v-else-if="cinemaSearchError">{{ cinemaSearchError }}</span>
              <span v-else-if="cinemaQuery.trim().length < 2">Saisissez au moins deux caractères.</span>
              <span v-else>Aucune commune trouvée.</span>
            </template>
          </NCombobox>
          <p class="field-hint">Séances des cinémas indépendants référencés par le SCARE dans un rayon de 30 km. La couverture varie selon les villes.</p>
        </section>
      </template>
      <template v-if="draft.type === 'clock'">
        <div class="clock-settings">
          <div class="clock-settings-heading"><div><span class="section-label">Villes</span><p>Recherchez une ville. Son fuseau horaire sera défini automatiquement.</p></div><span class="count-label">{{ clockCities.length }}/3</span></div>
          <VueDraggable v-model="clockCities" class="clock-city-list" handle=".clock-city-handle" :animation="150" item-key="timezone">
            <div v-for="(city, index) in clockCities" :key="city.timezone" class="clock-city-row">
              <span class="clock-city-index clock-city-handle" :aria-label="`Réordonner ${city.name}`" title="Faire glisser pour réordonner">{{ String(index + 1).padStart(2, '0') }}</span>
              <label><span class="sr-only">Ville {{ index + 1 }}</span><NCombobox
                :aria-label="`Ville ${index + 1}`"
                :model-value="clockOption(city)"
                :items="worldClockOptions"
                by="timezone"
                label-key="search"
                value-key="timezone"
                class="w-full"
                :_combobox-input="{ placeholder: 'Rechercher Paris, Tokyo…', autocomplete: 'off', autofocus: true }"
                :_combobox-trigger="{ trailing: 'i-ph-caret-down-bold', class: 'h-10 min-h-10 justify-start text-primary' }"
                :_combobox-list="{ class: 'clock-combobox-list', align: 'start', position: 'popper' }"
                @update:model-value="updateClockCity(index, $event)"
              >
                <template #trigger="{ modelValue }"><span v-if="modelValue" class="clock-selected-value"><span>{{ modelValue.name }}</span><small>, {{ modelValue.country }}</small></span><span v-else class="clock-placeholder">Choisir une ville…</span></template>
                <template #item="{ item }"><span class="clock-option"><span>{{ item.name }}</span><small>{{ item.country }} · {{ item.timezone }}</small></span></template>
              </NCombobox></label>
              <NTooltip v-if="clockCities.length > 1" content="Retirer cette ville">
                <NButton
                  type="button"
                  icon
                  label="i-ph-trash-bold"
                  btn="outline-gray"
                  class="clock-remove"
                  :aria-label="`Retirer ${city.name}`"
                  @click="removeClockCity(index)"
                />
              </NTooltip>
            </div>
          </VueDraggable>
          <button v-if="clockCities.length < 3" type="button" class="clock-add" @click="addClockCity">+ Ajouter une ville</button>
        </div>
      </template>
      <p v-if="error" role="alert" class="form-error">{{ error }}</p>
        <NDialogFooter class="settings-dialog-footer">
          <NTooltip v-if="!isNew" content="Supprimer le widget">
            <NButton
              type="button"
              icon
              label="i-ph-trash-bold"
              btn="ghost-error"
              class="delete-button"
              aria-label="Supprimer le widget"
              @click="emit('remove')"
            />
          </NTooltip>
          <NButton type="button" btn="soft" class="secondary-button" @click="close">Annuler</NButton>
          <NButton type="submit" btn="solid" class="primary" :disabled="saving">{{ saving ? 'Recherche…' : isNew ? 'Ajouter' : 'Enregistrer' }}</NButton>
        </NDialogFooter>
      </form>
    </NDialogContent>
  </NDialog>
</template>
<script setup lang="ts">
import { validFeedUrl, validTimezone } from '~/utils/boardConfig'
import type { BoardWidget } from '~/utils/boardConfig'
import type { City } from '~/utils/boardConfig'
import { worldClockOptions, type WorldClockOption } from '~/utils/worldClockCities'
import { VueDraggable } from 'vue-draggable-plus'
import { normalizeYoutubeChannelId, youtubeChannelHandleFromInput } from '~~/shared/utils/youtubeFeed'
import { isCinemaLocation, type CinemaLocation, type CinemaLocationOption } from '~~/shared/utils/cinema'
const props = defineProps<{ widget: BoardWidget; isNew?: boolean }>()
const emit = defineEmits<{ save: [widget: BoardWidget]; close: []; remove: [] }>()
const open = ref(true)
const titleInput = ref<HTMLInputElement | null>(null)
const draft = ref<BoardWidget>(JSON.parse(JSON.stringify(props.widget)))
const youtubeChannelInput = ref(props.widget.channelId ?? '')
const githubLanguageInput = ref(props.widget.githubLanguage ?? '')
const clockCities = ref<City[]>(JSON.parse(JSON.stringify(props.widget.cities ?? [])))
const cinemaQuery = ref(props.widget.cinemaLocation?.name ?? '')
const cinemaSearchResults = ref<CinemaLocationOption[]>([])
const cinemaSearchPending = ref(false)
const cinemaSearchError = ref('')
const cinemaLocationNeedsConfirmation = ref(false)
const query = ref('')
const searching = ref(false)
const saving = ref(false)
const error = ref('')
const cityError = ref('')
const results = ref<Array<{ id: number; name: string; lat: number; lon: number }>>([])
let controller: AbortController | undefined
let youtubeResolveController: AbortController | undefined
let cinemaController: AbortController | undefined
let cinemaSearchTimer: ReturnType<typeof setTimeout> | undefined
let request = 0
let closeRequested = false
onBeforeUnmount(() => {
  controller?.abort()
  youtubeResolveController?.abort()
  cinemaController?.abort()
  if (cinemaSearchTimer) clearTimeout(cinemaSearchTimer)
})
const selectedCinemaOption = computed<CinemaLocationOption | undefined>(() => {
  const location = draft.value.cinemaLocation
  return location ? { ...location, population: 0 } : undefined
})
const cinemaInputDisplayValue = (value: CinemaLocationOption | undefined) => value?.name ?? ''
const cinemaOptions = computed(() => {
  const search = cinemaQuery.value.trim().toLocaleLowerCase('fr-FR')
  const selected = selectedCinemaOption.value
  const keepSelected = selected && (!search || selected.name.toLocaleLowerCase('fr-FR').includes(search)) ? [selected] : []
  const known = new Set(keepSelected.map(option => option.inseeCode))
  return [...keepSelected, ...cinemaSearchResults.value.filter(option => !known.has(option.inseeCode))]
})
watch(cinemaQuery, (query) => {
  const normalized = query.trim()
  const matchesSelectedLocation = normalized.toLocaleLowerCase('fr-FR') === draft.value.cinemaLocation?.name.toLocaleLowerCase('fr-FR')
  cinemaLocationNeedsConfirmation.value = normalized.length > 0 && !matchesSelectedLocation
  if (cinemaSearchTimer) clearTimeout(cinemaSearchTimer)
  cinemaController?.abort()
  cinemaSearchError.value = ''
  cinemaSearchResults.value = []
  if (normalized.length < 2 || matchesSelectedLocation) {
    cinemaSearchPending.value = false
    return
  }

  cinemaSearchTimer = setTimeout(async () => {
    const activeController = new AbortController()
    cinemaController = activeController
    cinemaSearchPending.value = true
    try {
      cinemaSearchResults.value = await $fetch<CinemaLocationOption[]>('/api/sources/cinema-cities', {
        query: { q: normalized },
        signal: activeController.signal,
      })
    } catch (error) {
      if (!activeController.signal.aborted) cinemaSearchError.value = 'Recherche indisponible. Réessayez.'
    } finally {
      if (cinemaController === activeController) cinemaSearchPending.value = false
    }
  }, 250)
})
function selectCinemaLocation(value: CinemaLocationOption | null | undefined) {
  if (!value) return
  const location: CinemaLocation = {
    inseeCode: value.inseeCode,
    name: value.name,
    department: value.department,
    lat: value.lat,
    lon: value.lon,
  }
  draft.value.cinemaLocation = location
  delete draft.value.cinemaArea
  cinemaLocationNeedsConfirmation.value = false
  cinemaQuery.value = location.name
  cinemaSearchResults.value = []
  cinemaSearchError.value = ''
}
function requestClose() {
  if (closeRequested) return
  closeRequested = true
  youtubeResolveController?.abort()
  emit('close')
}
function handleOpenChange(value: boolean) {
  open.value = value
  if (!value) requestClose()
}
function focusDialogTitle(event: Event) {
  event.preventDefault()
  nextTick(() => titleInput.value?.focus())
}
function close() {
  requestClose()
}
function handleDialogKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || document.querySelector('[role="listbox"]')) return
  event.preventDefault()
  event.stopPropagation()
  requestClose()
}
function clockOption(city: City): WorldClockOption {
  return worldClockOptions.find(option => option.timezone === city.timezone) ?? {
    name: city.name,
    country: 'Fuseau personnalisé',
    timezone: city.timezone,
    search: `${city.name} ${city.timezone}`,
  }
}
function updateClockCity(index: number, option: WorldClockOption | null) {
  if (!option) return
  clockCities.value[index] = { name: option.name, timezone: option.timezone }
}
function addClockCity() {
  if (clockCities.value.length >= 3) return
  const option = worldClockOptions.find(candidate => !clockCities.value.some(city => city.timezone === candidate.timezone)) ?? worldClockOptions[0]
  if (option) clockCities.value.push({ name: option.name, timezone: option.timezone })
}
function removeClockCity(index: number) {
  if (clockCities.value.length <= 1) return
  clockCities.value.splice(index, 1)
}
async function searchCities() {
  const id = ++request
  controller?.abort()
  controller = new AbortController()
  searching.value = true
  cityError.value = ''
  results.value = []
  try {
    const found = await $fetch('/api/sources/cities', { query: { q: query.value }, signal: controller.signal })
    if (id !== request) return
    results.value = found
    if (!found.length) cityError.value = 'Aucune ville trouvée.'
  } catch { if (id === request) cityError.value = 'Recherche indisponible. Réessayez.' }
  finally { if (id === request) searching.value = false }
}
async function save() {
  if (saving.value) return
  error.value = ''
  draft.value.title = draft.value.title.trim()
  if (!draft.value.title) { error.value = 'Donnez un titre au widget.'; return }
  if (draft.value.type === 'rss') {
    draft.value.feedUrl = draft.value.feedUrl?.trim()
    if (!validFeedUrl(draft.value.feedUrl ?? '')) { error.value = 'Saisissez une adresse de flux HTTPS valide.'; return }
  }
  if (draft.value.type === 'cinema') {
    if (!isCinemaLocation(draft.value.cinemaLocation) || cinemaLocationNeedsConfirmation.value) {
      error.value = 'Choisissez une commune dans la liste de suggestions.'
      return
    }
  }
  if (draft.value.type === 'youtube') {
    let channelId = normalizeYoutubeChannelId(youtubeChannelInput.value)
    if (!channelId && !youtubeChannelHandleFromInput(youtubeChannelInput.value)) {
      error.value = 'Saisissez un ID de chaîne UC… ou une URL YouTube /@handle.'
      return
    }
    if (!channelId) {
      saving.value = true
      youtubeResolveController = new AbortController()
      try {
        const result = await $fetch<{ channelId: string }>('/api/sources/youtube-channel', {
          query: { url: youtubeChannelInput.value.trim() },
          signal: youtubeResolveController.signal,
        })
        channelId = normalizeYoutubeChannelId(result.channelId)
      } catch {
        error.value = 'Impossible de résoudre cette chaîne. Vérifiez son URL publique ou saisissez son ID UC….'
        return
      } finally {
        saving.value = false
      }
    }
    if (!channelId) { error.value = 'YouTube a renvoyé un identifiant de chaîne invalide.'; return }
    draft.value.channelId = channelId
  }
  if (draft.value.type === 'github-trending' || draft.value.type === 'github-developers-trending') {
    if (!['daily', 'weekly', 'monthly'].includes(String(draft.value.githubPeriod))) {
      error.value = 'Choisissez une période GitHub valide.'
      return
    }
    draft.value.githubLanguage = githubLanguageInput.value.trim()
  }
  if (draft.value.type === 'clock') {
    const cities = clockCities.value.map(city => ({ name: city.name.trim(), timezone: city.timezone.trim() }))
    if (!cities.length || cities.length > 3 || cities.some(city => !city.name || !validTimezone(city.timezone))) { error.value = 'Choisissez une à trois villes dans la liste.'; return }
    draft.value.cities = cities
  }
  emit('save', JSON.parse(JSON.stringify(draft.value)))
}
</script>
<style>
.settings-dialog-overlay { position: fixed; inset: 0; z-index: 49; background: #08080cbb; }
.settings-dialog-content { position: fixed; top: 50%; left: 50%; z-index: 50; width: min(560px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); overflow-y: auto; padding: 24px; border: 1px solid #444149; border-radius: 6px; background: #1a191f; color: #e3e0e7; font: 13px/1.6 'SF Mono', Consolas, monospace; transform: translate(-50%, -50%); }
.settings-dialog-overlay[data-state='open'] { animation: settings-dialog-fade-in 160ms ease-out; }
.settings-dialog-overlay[data-state='closed'] { animation: settings-dialog-fade-out 120ms ease-in; }
.settings-dialog-content[data-state='open'] { animation: settings-dialog-in 180ms ease-out; }
.settings-dialog-content[data-state='closed'] { animation: settings-dialog-out 120ms ease-in; }
@keyframes settings-dialog-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes settings-dialog-fade-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes settings-dialog-in { from { opacity: 0; transform: translate(-50%, -48%) scale(.96); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
@keyframes settings-dialog-out { from { opacity: 1; transform: translate(-50%, -50%) scale(1); } to { opacity: 0; transform: translate(-50%, -48%) scale(.96); } }
.settings-dialog-content .settings-dialog-header { margin-bottom: 24px; }
.settings-dialog-header h2 { margin: 0; font-size: 17px; font-weight: 500; }
.settings-dialog-content label { display: block; margin: 16px 0; font-size: 12px; color: #bdb8c5; }
.settings-dialog-content .settings-title-field { margin: 0; }
.settings-dialog-content .widget-settings-section { margin-top: 28px; }
.settings-dialog-content .widget-settings-section > label { margin: 0; }
.settings-dialog-content .widget-settings-section .field-hint { margin: 12px 0 0; }
.settings-dialog-content .youtube-grayscale-setting { display: flex; min-height: 40px; align-items: center; justify-content: space-between; gap: 16px; margin-top: 24px; }
.settings-dialog-content .youtube-grayscale-setting label { margin: 0; color: #bdb8c5; cursor: pointer; }
.settings-dialog-content .youtube-grayscale-hint { margin-top: 4px; }
.settings-dialog-content .github-trending-settings select { display: block; width: 100%; margin-top: 6px; padding: 10px; background: #242329; border: 1px solid #55515d; border-radius: 4px; color: #ece9ee; font: inherit; }
.settings-dialog-content .cinema-settings .combobox { display: block; width: 100%; margin-top: 6px; }
.settings-dialog-content .cinema-settings .cinema-location-input { width: 100%; min-height: 40px; border-color: #55515d; background: #242329; color: #ece9ee; font: inherit; }
.settings-dialog-content .cinema-settings .cinema-location-input::placeholder { color: #85838d; opacity: 1; }
.settings-dialog-content .weather-settings .selected-location { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; margin: 12px 0 0; }
.settings-dialog-content .weather-settings .selected-location span { color: #85838d; font-size: 10px; letter-spacing: .4px; text-transform: uppercase; }
.settings-dialog-content .weather-settings .selected-location strong { color: #bdb8c5; font-weight: 500; }
.settings-dialog-content input, .settings-dialog-content textarea { display: block; width: 100%; min-width: 0; margin-top: 6px; padding: 10px; background: #242329; border: 1px solid #55515d; border-radius: 4px; color: #ece9ee; font: inherit; }
.settings-dialog-content .search-row button, .settings-dialog-content .city-results button, .settings-dialog-content .clock-add { background: transparent; border: 1px solid #444149; border-radius: 4px; color: #d8c58f; padding: 6px 16px; min-height: 36px; font: inherit; cursor: pointer; }
.settings-dialog-content button:disabled { opacity: .5; }
.settings-dialog-content input:focus-visible, .settings-dialog-content textarea:focus-visible, .settings-dialog-content .search-row button:focus-visible, .settings-dialog-content .city-results button:focus-visible, .settings-dialog-content .clock-add:focus-visible { outline: 2px solid #d8c58f; outline-offset: 2px; }
.settings-dialog-content p { font-size: 11px; color: #aaa7b2; }
.settings-dialog-content .search-row { display: flex; gap: 8px; align-items: stretch; margin-top: 6px; }
.settings-dialog-content .search-row > input { flex: 1 1 auto; min-width: 0; height: 40px; margin-top: 0; padding: 0 10px; }
.settings-dialog-content .search-row > button { flex: 0 0 auto; height: 40px; min-height: 40px; padding: 0 16px; white-space: nowrap; }
.settings-dialog-content .city-results { padding: 0; list-style: none; }
.settings-dialog-content .city-results button { width: 100%; margin-bottom: 6px; text-align: left; }
.settings-dialog-content .clock-settings { margin-top: 32px; }
.settings-dialog-content .clock-city-list { display: flex; flex-direction: column; }
.settings-dialog-content .clock-settings-heading { display: flex; align-items: start; justify-content: space-between; gap: 16px; }
.settings-dialog-content .section-label { display: block; margin: 0; color: #bdb8c5; }
.settings-dialog-content .count-label { color: #85838d; font-size: 11px; padding-top: 3px; }
.settings-dialog-content .clock-settings-heading p { margin: 4px 0 16px; }
.settings-dialog-content .clock-city-row { display: grid; grid-template-columns: 32px minmax(0, 1fr) auto; align-items: center; gap: 12px; margin: 16px 0; }
.settings-dialog-content .clock-city-row > label { display: block; min-width: 0; margin: 0; }
.settings-dialog-content .clock-city-index { display: flex; align-self: stretch; align-items: center; justify-content: flex-start; color: #aaa7b2; font-size: 18px; font-weight: 500; letter-spacing: .04em; line-height: 1; }
.settings-dialog-content .clock-city-handle { cursor: grab; touch-action: none; user-select: none; }
.settings-dialog-content .clock-city-handle:active { cursor: grabbing; }
.settings-dialog-content .clock-city-row.sortable-ghost { opacity: .35; }
.settings-dialog-content .clock-city-row.sortable-chosen { cursor: grabbing; }
.clock-combobox-list { z-index: 60; max-height: 280px; overflow-y: auto; padding: 4px; border: 1px solid #55515d; border-radius: 4px; background: #242329; box-shadow: 0 12px 30px #08080c88; }
.clock-combobox-list[data-state='open'] { animation: clock-combobox-in 140ms ease-out; }
.clock-combobox-list[data-state='closed'] { animation: clock-combobox-out 100ms ease-in; }
.clock-combobox-list > .input-wrapper { flex: 0 0 auto; border-bottom: 1px solid #3a3840; background: #242329; }
.clock-combobox-list .input-leading-wrapper { display: none; }
.clock-combobox-list > .input-wrapper .input { width: 100%; min-height: 34px; padding: 7px 8px; border: 0; border-radius: 0; background: #242329; box-shadow: none; color: #ece9ee; font: inherit; }
.clock-combobox-list > .input-wrapper .input::placeholder { color: #85838d; opacity: 1; }
.clock-combobox-list > .input-wrapper .input:focus { outline: none; }
.clock-combobox-list > .input-wrapper .input:focus-visible { outline: 2px solid #d8c58f; outline-offset: -2px; }
.clock-combobox-list [role='option'] { display: flex; align-items: center; min-height: 38px; padding: 7px 9px; border-radius: 3px; color: #d9d5df; cursor: pointer; }
.clock-combobox-list [role='option'][data-highlighted] { background: #35333c; color: #ece9ee; }
.cinema-combobox-list { z-index: 60; max-height: 280px; overflow-y: auto; padding: 4px; border: 1px solid #55515d; border-radius: 4px; background: #242329; box-shadow: 0 12px 30px #08080c88; }
.cinema-combobox-list[data-state='open'] { animation: clock-combobox-in 140ms ease-out; }
.cinema-combobox-list [role='option'] { display: flex; align-items: center; min-height: 40px; padding: 8px 10px; border-radius: 3px; color: #d9d5df; cursor: pointer; }
.cinema-combobox-list [role='option'][data-highlighted] { background: #35333c; color: #ece9ee; }
.cinema-location-option { display: flex; flex: 1; align-items: baseline; justify-content: space-between; gap: 12px; }
.cinema-location-option small { color: #aaa7b2; font-size: 11px; }
.settings-dialog-content .clock-selected-value { display: flex; flex: 1 1 0%; align-items: baseline; gap: 3px; min-width: 0; overflow: hidden; white-space: nowrap; line-height: 1.2; }
.settings-dialog-content .clock-selected-value > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; line-height: 1.2; }
.settings-dialog-content .clock-selected-value small { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #aaa7b2; font-size: 11px; font-weight: 400; line-height: 1.2; }
.clock-option { display: flex; flex-direction: column; align-items: start; gap: 0; min-width: 0; line-height: 1.15; }
.clock-option small { color: #aaa7b2; font-size: 10px; font-weight: 400; line-height: 1.15; }
.settings-dialog-content .clock-placeholder { color: #aaa7b2; }
.settings-dialog-content .clock-remove { width: 40px; height: 40px; min-width: 40px; min-height: 40px; }
.settings-dialog-content .clock-remove [icon-base] { width: 16px; height: 16px; }
.settings-dialog-content .clock-add { width: 100%; margin-top: 8px; border-style: dashed; color: #aaa7b2; }
.settings-dialog-footer { position: sticky; bottom: -24px; display: flex; justify-content: end; gap: 8px; flex-wrap: wrap; margin: 24px -24px -24px; padding: 16px 24px 24px; border-top: 1px solid #303036; background: #1a191f; }
.settings-dialog-content .dialog-close-button { width: 44px; height: 44px; min-width: 44px; min-height: 44px; }
.settings-dialog-content .dialog-close-button [icon-base] { width: 20px; height: 20px; }
.settings-dialog-content .delete-button { width: 40px; height: 40px; min-width: 40px; min-height: 40px; margin-right: auto; }
.settings-dialog-content .delete-button [icon-base] { width: 18px; height: 18px; }
.settings-dialog-content .primary { --una-primary: 81% .11 90; --una-primary-foreground: 18% .02 90; }
.settings-dialog-content .form-error { color: #e6a19c; }
.settings-dialog-content .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@keyframes clock-combobox-in { from { opacity: 0; transform: translateY(-3px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes clock-combobox-out { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-2px) scale(.98); } }
@media (max-width: 480px) {
  .settings-dialog-footer > button:not(.delete-button) { flex: 1; }
}
</style>
