<template>
  <main class="dashboard" :class="{ 'grid-interacting': gridInteracting }">
    <div class="board-shell">
      <header class="board-header">
        <NuxtLink to="/" class="brand">encascade<span>↘</span></NuxtLink>
        <nav class="dashboard-tabs" aria-label="Tableaux">
          <NuxtLink to="/" class="board-tab" :class="{ active: dashboardId === 'daily' }" :aria-current="dashboardId === 'daily' ? 'page' : undefined">Quotidien</NuxtLink>
          <NuxtLink to="/?board=tech" class="board-tab" :class="{ active: dashboardId === 'tech' }" :aria-current="dashboardId === 'tech' ? 'page' : undefined">Tech</NuxtLink>
          <NuxtLink to="/?board=cinema" class="board-tab" :class="{ active: dashboardId === 'cinema' }" :aria-current="dashboardId === 'cinema' ? 'page' : undefined">Cinéma</NuxtLink>
        </nav>
      </header>
      <div class="board-status">
        <p v-if="editing">{{ mobile ? 'Configurez vos widgets depuis leur menu.' : 'Déplacez-les par leur poignée. Ouvrez le menu pour les configurer.' }}</p>
        <span class="sr-only" role="status">{{ store.message }}</span>
      </div>
      <template v-if="store.ready">
        <div v-if="!store.widgets.length" class="empty-board"><h2>Votre tableau attend ses premières sources.</h2><button class="native-button" @click="openWidgetPicker">Ajouter un widget</button></div>
        <GridLayout v-else-if="!mobile" ref="grid" :layout="layout" :col-num="12" :row-height="40" :gap="gridGap" :is-draggable="editing" :is-resizable="editing" :resize-config="resizeConfig" @update:layout="store.setLayout" @interaction-start="gridInteracting = true" @interaction-end="gridInteracting = false" @error="store.message = 'La grille a rencontré une erreur'" @operation-rejected="store.message = 'Cette position ou dimension n’est pas disponible'">
          <GridItem v-for="widget in store.widgets" :key="widget.id" :i="widget.id" drag-allow-from=".widget-drag-handle" class="board-grid-item">
            <div class="widget-shell" :class="{ 'cinema-widget-shell': isCinemaWidget(widget.type), 'cinema-widget-resizing': editing && isCinemaWidget(widget.type) }">
              <header class="widget-titlebar">
                <NTooltip :content="widget.title"><h2>{{ widget.title }}</h2></NTooltip>
                <div class="widget-title-actions">
                  <NButton v-if="(widget.type === 'youtube' && youtubeAvailable.has(widget.id)) || widget.type === 'github-trending' || widget.type === 'github-developers-trending' || widget.type === 'hacker-news' || widget.type === 'openrouter-models' || isCinemaWidget(widget.type)" type="button" btn="ghost" class="youtube-list-action" :aria-label="isCinemaWidget(widget.type) ? `Voir la liste complète · ${widget.title}` : undefined" @click="readMore(widget.id)">
                    <span class="youtube-list-action-label">Voir la liste complète</span> <span class="i-ph-arrow-up-right-bold" aria-hidden="true" />
                  </NButton>
                  <div v-if="editing" class="widget-actions">
                    <BoardWidgetActionsMenu @configure="configure(widget)" @adjust="openAdjustments(widget.id)" @remove="removeWidget(widget)" />
                    <NTooltip content="Déplacer le widget"><span class="widget-drag-handle" aria-label="Déplacer le widget" aria-hidden="true"><span class="i-ph-dots-six-vertical-bold" /></span></NTooltip>
                  </div>
                </div>
              </header>
              <article class="board-widget" :class="[{ editing }, { 'youtube-widget': widget.type === 'youtube' }, { 'cinema-widget': isCinemaWidget(widget.type) }]" :aria-label="widget.title">
                <div class="widget-body" :class="{ 'widget-body-youtube': widget.type === 'youtube' }">
                  <BoardContent :widget="widget" :dashboard-id="dashboardId" @more="readMore(widget.id)" @availability="setYoutubeAvailability(widget.id, $event)" />
                </div>
              </article>
            </div>
          </GridItem>
        </GridLayout>
        <div v-else class="mobile-board">
          <div v-for="widget in ordered" :key="widget.id" class="widget-shell" :class="{ 'cinema-widget-shell': isCinemaWidget(widget.type), 'cinema-widget-resizing': editing && isCinemaWidget(widget.type) }" :style="{ height: widget.type === 'rss' || widget.type === 'github-trending' || widget.type === 'github-developers-trending' || widget.type === 'hacker-news' || widget.type === 'openrouter-models' || isCinemaWidget(widget.type) ? '486px' : '306px' }">
            <header class="widget-titlebar">
              <NTooltip :content="widget.title"><h2>{{ widget.title }}</h2></NTooltip>
              <div class="widget-title-actions">
                <NButton v-if="(widget.type === 'youtube' && youtubeAvailable.has(widget.id)) || widget.type === 'github-trending' || widget.type === 'github-developers-trending' || widget.type === 'hacker-news' || widget.type === 'openrouter-models' || isCinemaWidget(widget.type)" type="button" btn="ghost" class="youtube-list-action" :aria-label="isCinemaWidget(widget.type) ? `Voir la liste complète · ${widget.title}` : undefined" @click="readMore(widget.id)">
                  <span class="youtube-list-action-label">Voir la liste complète</span> <span class="i-ph-arrow-up-right-bold" aria-hidden="true" />
                </NButton>
                <BoardWidgetActionsMenu v-if="editing" @configure="configure(widget)" @adjust="openAdjustments(widget.id)" @remove="removeWidget(widget)" />
              </div>
            </header>
            <article class="board-widget" :class="[{ editing }, { 'youtube-widget': widget.type === 'youtube' }, { 'cinema-widget': isCinemaWidget(widget.type) }]" :aria-label="widget.title">
              <div class="widget-body" :class="{ 'widget-body-youtube': widget.type === 'youtube' }">
                <BoardContent :widget="widget" :dashboard-id="dashboardId" @more="readMore(widget.id)" @availability="setYoutubeAvailability(widget.id, $event)" />
              </div>
            </article>
          </div>
        </div>
      </template>
  </div>
    <div v-if="store.ready" class="board-control-dock" :class="{ 'is-editing': editing }" role="group" aria-label="Commandes du tableau">
      <NTooltip v-if="editing" content="Annuler la dernière modification">
        <NButton type="button" icon label="i-ph-arrow-arc-left-bold" btn="ghost" class="dock-button" aria-label="Annuler la dernière modification" :disabled="!store.history.length" @click="store.undo" />
      </NTooltip>
      <NTooltip content="Ajouter un widget (A)">
        <NButton type="button" icon label="i-ph-plus-bold" btn="ghost" class="dock-button dock-add" aria-label="Ajouter un widget" aria-keyshortcuts="A" :disabled="store.widgets.length >= 24" @click="openWidgetPicker" />
      </NTooltip>
      <span v-if="editing" class="dock-divider" aria-hidden="true" />
      <NTooltip :content="editing ? 'Terminer le mode édition (E)' : 'Modifier le tableau (E)'">
        <NButton type="button" icon :label="editing ? 'i-ph-check-bold' : 'i-ph-pencil-simple-bold'" btn="ghost" class="dock-button" :aria-label="editing ? 'Terminer le mode édition' : 'Modifier le tableau'" aria-keyshortcuts="E" :aria-pressed="editing" @click="toggleEditing" />
      </NTooltip>
    </div>
    <BoardSettings v-if="settings" :key="settings.id" :widget="settings" :is-new="isNew" @save="save" @close="settings = undefined" @remove="remove" />
    <NDialog v-model:open="pickerOpen">
      <NDialogContent
        class="widget-picker-dialog-content"
        :_dialog-overlay="{ class: 'widget-picker-overlay' }"
        :show-close="false"
        @open-auto-focus="focusPickerSearch"
        @keydown.capture="closeWidgetPickerOnEscape"
      >
        <div class="widget-picker-header">
          <NDialogTitle id="picker-title" tabindex="-1">Ajouter un widget</NDialogTitle>
          <NTooltip content="Fermer le catalogue" tooltip="black" :_tooltip-content="{ class: 'widget-picker-tooltip' }">
            <NButton type="button" icon label="i-ph-x-bold" btn="ghost" class="widget-picker-close" aria-label="Fermer le catalogue" @click="pickerOpen = false" />
          </NTooltip>
        </div>
        <label class="widget-catalog-search">
          <span class="i-ph-magnifying-glass" aria-hidden="true" />
          <input ref="widgetSearchInput" v-model="widgetSearch" type="search" aria-label="Rechercher parmi les widgets" placeholder="Rechercher un widget…">
        </label>
        <div class="widget-catalog-scroll">
          <div v-if="filteredWidgetCatalog.length" class="widget-catalog">
            <button v-for="item in filteredWidgetCatalog" :key="item.type" class="widget-catalog-card" type="button" @click="add(item.type)">
              <span class="widget-catalog-illustration" :class="`accent-${item.accent}`" aria-hidden="true"><span :class="item.icon" /></span>
              <span class="widget-catalog-copy">
                <span class="widget-catalog-title">{{ item.title }}</span>
                <span class="widget-catalog-description">{{ item.description }}</span>
              </span>
            </button>
          </div>
          <p v-else class="widget-catalog-empty" role="status">Aucun widget ne correspond à « {{ widgetSearch }} ».</p>
        </div>
      </NDialogContent>
    </NDialog>
    <dialog ref="adjustments" class="adjust-dialog" aria-labelledby="adjust-title" @click="($event.target === adjustments) && adjustments?.close()">
      <div class="detail-heading"><h2 id="adjust-title">Ajuster · {{ adjustedItem?.title }}</h2><NTooltip content="Fermer"><button class="native-button dialog-icon-button" autofocus aria-label="Fermer les ajustements" @click="adjustments?.close()"><span class="i-ph-x-bold" aria-hidden="true" /></button></NTooltip></div>
      <p>Une alternative au glisser-déposer, utilisable au clavier.</p>
      <div v-if="adjustedItem" class="widget-controls">
        <label>Largeur (colonnes)<select aria-label="Largeur du widget" :value="adjustedItem.w" @change="resize('w', ($event.target as HTMLSelectElement).value)"><option v-for="n in 10" :key="n" :value="n + 2">{{ n + 2 }}</option></select></label>
        <label>Hauteur (crans)<select aria-label="Hauteur du widget" :value="adjustedItem.h" @change="resize('h', ($event.target as HTMLSelectElement).value)"><option v-for="n in 13" :key="n" :value="n + 3">{{ n + 3 }}</option></select></label>
      </div>
      <footer class="dialog-footer"><NButton type="button" btn="soft" @click="adjustments?.close()">Terminer</NButton></footer>
    </dialog>
    <NDialog v-if="detailWidget && ((detailWidget.type === 'cinema' && !mobile) || !['cinema', 'youtube', 'openrouter-models'].includes(detailWidget.type))" v-model:open="detailOpen">
      <NDialogContent
        class="widget-detail-dialog-content"
        :_dialog-overlay="{ class: 'widget-detail-dialog-overlay' }"
        :show-close="false"
        style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(94vw, 1600px); height: min(90dvh, 1040px); max-width: none; max-height: none; overflow: hidden;"
        @open-auto-focus="focusDetailTitle"
      >
        <BoardWidgetDetail :widget="detailWidget" :dashboard-id="dashboardId" @close="detailOpen = false" />
      </NDialogContent>
    </NDialog>
    <NDrawer
      v-if="detailWidget && (detailWidget.type === 'youtube' || detailWidget.type === 'openrouter-models' || (detailWidget.type === 'cinema' && mobile))"
      v-model:open="detailOpen"
      :direction="detailWidget.type === 'youtube' || mobile ? 'bottom' : 'right'"
      :title="detailWidget?.title ?? 'Actualités'"
      :description="detailWidget?.type === 'youtube' ? 'Toutes les vidéos récentes de cette chaîne' : detailWidget?.type === 'openrouter-models' ? 'Les modèles récemment ajoutés au catalogue OpenRouter' : 'Les films et séances à venir dans la zone choisie'"
      :una="detailDrawerUna"
    >
      <template #content>
        <BoardWidgetDetail v-if="detailWidget" :widget="detailWidget" :dashboard-id="dashboardId" @close="detailOpen = false" />
      </template>
    </NDrawer>
  </main>
</template>
<script setup lang="ts">
import { GridLayout, GridItem } from 'grid-layout-plus'
import type { GridLayoutExpose, Layout, ResizeConfig } from 'grid-layout-plus'
import 'grid-layout-plus/style.css'
import BoardYouTube from './BoardYouTube.vue'
import BoardWidgetActionsMenu from './BoardWidgetActionsMenu.vue'
import { widgetDefaults } from '~/utils/boardConfig'
import type { BoardWidget, DashboardId, WidgetKind } from '~/utils/boardConfig'
const props = defineProps<{ dashboardId: DashboardId }>()
const store = useBoardStore()
const resizeConfig: ResizeConfig = { handles: ['se'] }
const gridGap: [number, number] = [20, 20]
const grid = ref<GridLayoutExpose>()
const editing = ref(false)
const gridInteracting = ref(false)
const mobile = ref(false)
const adjustments = ref<HTMLDialogElement>()
const adjustedId = ref('')
const adjustedItem = computed(() => store.widgets.find(w => w.id === adjustedId.value))
const settings = ref<BoardWidget>()
const isNew = ref(false)
const pickerOpen = ref(false)
const widgetSearch = ref('')
const widgetSearchInput = ref<HTMLInputElement>()
const widgetCatalog = [
  { type: 'rss', title: 'Actualités RSS', description: 'Les derniers articles de vos sites préférés', icon: 'i-ph-rss', accent: 'rss' },
  { type: 'youtube', title: 'Vidéos YouTube', description: 'Les dernières vidéos d’une chaîne', icon: 'i-ph-youtube-logo', accent: 'youtube' },
  { type: 'github-trending', title: 'Dépôts GitHub tendance', description: 'Les dépôts qui gagnent le plus d’étoiles', icon: 'i-ph-github-logo', accent: 'github' },
  { type: 'github-developers-trending', title: 'Développeurs GitHub tendance', description: 'Les profils et dépôts populaires du classement GitHub', icon: 'i-ph-users-three', accent: 'developers' },
  { type: 'hacker-news', title: 'Hacker News', description: 'Les liens techniques les plus discutés', icon: 'i-ph-newspaper', accent: 'news' },
  { type: 'openrouter-models', title: 'Modèles d’IA récents', description: 'Les derniers ajouts au catalogue OpenRouter', icon: 'i-ph-cpu', accent: 'models' },
  { type: 'cinema', title: 'Séances de cinéma', description: 'La programmation des cinémas indépendants près de chez vous', icon: 'i-ph-film-strip', accent: 'cinema' },
  { type: 'cinema-releases', title: 'Programmation à venir', description: 'Les prochains films programmés dans les cinémas SCARE', icon: 'i-ph-calendar-dots', accent: 'cinema' },
  { type: 'weather', title: 'Météo', description: 'Les conditions et températures de votre ville', icon: 'i-ph-cloud-sun', accent: 'weather' },
  { type: 'clock', title: 'Horloges', description: 'L’heure dans une à trois villes', icon: 'i-ph-clock', accent: 'clock' },
] satisfies { type: WidgetKind; title: string; description: string; icon: string; accent: string }[]
const normalizedWidgetSearch = computed(() => widgetSearch.value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('fr').trim())
const filteredWidgetCatalog = computed(() => {
  const query = normalizedWidgetSearch.value
  if (!query) return widgetCatalog
  return widgetCatalog.filter(item => `${item.title} ${item.description}`.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('fr').includes(query))
})
const detailId = ref('')
const detailWidget = computed(() => store.widgets.find(w => w.id === detailId.value))
const detailOpen = ref(false)
const youtubeAvailable = ref(new Set<string>())
const mobileBoardQuery = '(max-width: 767px), (max-width: 900px) and (max-height: 500px)'
const detailDrawerUna = computed(() => ({
  drawerContent: [
    'border-[#444149] bg-[#1a191f] p-0 text-[#e3e0e7]',
    'data-[vaul-drawer-direction=bottom]:h-[88dvh] data-[vaul-drawer-direction=bottom]:max-h-[88dvh] data-[vaul-drawer-direction=bottom]:rounded-t-xl data-[vaul-drawer-direction=bottom]:border-t',
    detailWidget.value?.type === 'openrouter-models' || (!mobile.value && detailWidget.value?.type !== 'youtube')
      ? 'data-[vaul-drawer-direction=right]:border-l'
      : '',
    detailWidget.value?.type === 'openrouter-models'
      ? 'data-[vaul-drawer-direction=right]:w-[88vw] data-[vaul-drawer-direction=right]:sm:max-w-[1100px]'
      : 'data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-[640px]',
    'data-[vaul-drawer-direction=bottom]:w-full data-[vaul-drawer-direction=bottom]:max-w-[min(100vw,1280px)]',
  ].join(' '),
}))
function isCinemaWidget(type: WidgetKind | undefined): boolean {
  return type === 'cinema' || type === 'cinema-releases'
}
const layout = computed<Layout>(() => store.widgets.map(w => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h, minW: 3, minH: 4, maxH: 16 })))
const ordered = computed(() => [...store.widgets].sort((a, b) => a.y - b.y || a.x - b.x))
watch(() => props.dashboardId, (dashboard) => {
  store.init(dashboard)
  editing.value = false
  gridInteracting.value = false
  settings.value = undefined
  detailOpen.value = false
  pickerOpen.value = false
  youtubeAvailable.value = new Set()
})
let media: MediaQueryList
const syncMobile = () => { mobile.value = media.matches }
function toggleEditing() {
  editing.value = !editing.value
  if (!editing.value) gridInteracting.value = false
}
async function openWidgetPicker() {
  if (!editing.value) {
    editing.value = true
    await nextTick()
  }
  widgetSearch.value = ''
  pickerOpen.value = true
}
function focusPickerSearch(event: Event) {
  event.preventDefault()
  nextTick(() => widgetSearchInput.value?.focus())
}
function focusDetailTitle(event: Event) {
  event.preventDefault()
  nextTick(() => document.querySelector<HTMLElement>('.widget-detail-dialog-content .widget-detail-title')?.focus())
}
function closeWidgetPickerOnEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  event.preventDefault()
  event.stopPropagation()
  pickerOpen.value = false
}
function isInteractiveTarget(target: EventTarget | null) {
  const element = target instanceof HTMLElement ? target : null
  return Boolean(element?.closest('input, textarea, select, button, a, summary, [contenteditable="true"]'))
}
const shortcuts: Record<string, () => void> = {
  e: toggleEditing,
  a: () => { void openWidgetPicker() },
}
function handleShortcut(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  const action = shortcuts[key]
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || !action) return
  if (isInteractiveTarget(event.target) || document.querySelector('dialog[open], [role="dialog"][data-state="open"], details[open]')) return
  event.preventDefault()
  action()
}
onMounted(() => { store.init(props.dashboardId); media = matchMedia(mobileBoardQuery); syncMobile(); media.addEventListener('change', syncMobile); window.addEventListener('keydown', handleShortcut) })
onBeforeUnmount(() => { media?.removeEventListener('change', syncMobile); window.removeEventListener('keydown', handleShortcut) })
function configure(widget: BoardWidget) { isNew.value = false; settings.value = JSON.parse(JSON.stringify(widget)) }
async function add(type: WidgetKind) {
  pickerOpen.value = false
  isNew.value = true
  const newWidget = widgetDefaults(type, crypto.randomUUID())
  await nextTick()
  settings.value = newWidget
}
function save(widget: BoardWidget) { if (store.saveWidget(widget)) settings.value = undefined }
function removeWidget(widget: BoardWidget) { store.removeWidget(widget.id) }
function remove() { if (settings.value) { store.removeWidget(settings.value.id); settings.value = undefined } }
function openAdjustments(id: string) { adjustedId.value = id; adjustments.value?.showModal() }
function resize(axis: 'w' | 'h', value: string) { const p = adjustedItem.value; if (p) grid.value?.resizeItem(p.id, axis === 'w' ? Number(value) : p.w, axis === 'h' ? Number(value) : p.h) }
function readMore(id: string) { detailId.value = id; detailOpen.value = true }
function setYoutubeAvailability(id: string, available: boolean) {
  const next = new Set(youtubeAvailable.value)
  if (available) next.add(id)
  else next.delete(id)
  youtubeAvailable.value = next
}
</script>
<style scoped>
.dashboard { --una-primary: 81% .11 90; --una-primary-foreground: 18% .02 90; background: #141418; color: #e3e0e7; min-height: 100vh; font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace; font-size: 13px; }
.board-shell { max-width: 1440px; margin: auto; padding: 24px 32px 104px; }
.board-header { display: flex; align-items: center; gap: 36px; min-height: 62px; border-bottom: 1px solid #303036; }
.brand { color: #ece9ee; font-size: 20px; letter-spacing: -1px; text-decoration: none; }
.brand span { margin-left: 8px; color: #d8c58f; }
.dashboard-tabs { align-self: stretch; display: flex; align-items: stretch; gap: 24px; }
.board-tab { display: flex; align-items: center; border-bottom: 2px solid transparent; color: #85838d; text-decoration: none; transition: color 140ms ease, border-color 140ms ease; }
.board-tab:hover, .board-tab.active { color: #e3e0e7; }
.board-tab.active { border-color: #d8c58f; }
.native-button { font: inherit; color: #d8c58f; border: 1px solid #444149; border-radius: 4px; padding: 9px 12px; background: transparent; cursor: pointer; min-height: 40px; }
.native-button:disabled { opacity: .45; cursor: default; }
.native-button:hover:not(:disabled) { background: #29282e; }
.native-button:focus-visible, select:focus-visible, a:focus-visible { outline: 2px solid #d8c58f; outline-offset: 3px; }
.eyebrow { font-size: 10px; letter-spacing: 1.3px; color: #b0a5a0; margin: 0 0 10px; }
.board-status { min-height: 42px; display: flex; align-items: center; color: #aaa7b2; font-size: 11px; margin-bottom: 16px; }
.board-status p { margin: 0; }
.widget-shell { height: 100%; min-height: 0; display: flex; flex-direction: column; }
.board-widget { flex: 1 1 auto; min-height: 0; border: 1px solid #303036; background: #1a191f; border-radius: 6px; display: flex; flex-direction: column; overflow: hidden; }
.board-widget.editing { border-color: #766b4c; }
.board-widget.youtube-widget { border: 0; background: transparent; border-radius: 0; }
.board-widget.cinema-widget { border: 0; background: transparent; border-radius: 0; }
.widget-titlebar h2 { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.widget-titlebar { gap: 10px; display: flex; align-items: center; justify-content: space-between; flex: 0 0 40px; padding: 0 6px; }
.editing .widget-titlebar { cursor: grab; touch-action: none; }
h2 { font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; margin: 0; color: #bdb8c5; }
.widget-title-actions { display: flex; min-width: 0; flex-shrink: 0; align-items: center; justify-content: flex-end; gap: 8px; }
.youtube-list-action { min-height: 40px; padding-inline: 8px; color: #aaa7b2; font: inherit; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; }
.youtube-list-action:hover { color: #d8c58f; }
.board-control-dock { box-sizing: border-box; position: fixed; z-index: 40; left: 50%; bottom: calc(28px + env(safe-area-inset-bottom, 0px)); display: flex; align-items: center; justify-content: center; gap: 4px; width: 96px; padding: 5px; border: 1px solid #393740; border-radius: 999px; background: rgba(27, 26, 32, .9); box-shadow: 0 8px 28px #0008; backdrop-filter: blur(16px); transform: translateX(-50%); transition: width 240ms cubic-bezier(.2, .75, .25, 1), box-shadow 180ms ease; }
.board-control-dock.is-editing { width: 152px; box-shadow: 0 10px 32px #0009; }
.board-control-dock :deep(.dock-button) { box-sizing: border-box; width: 40px; height: 40px; min-height: 40px; padding: 0; border-radius: 999px; color: #c4c0ca; font-size: 16px; transition: color 140ms ease, background-color 140ms ease, transform 140ms ease; }
.board-control-dock :deep(.dock-button:hover:not(:disabled)) { color: #e6cd84; background: #343139; }
.board-control-dock :deep(.dock-button:focus-visible) { outline: 2px solid #e6cd84; outline-offset: 2px; }
.board-control-dock :deep(.dock-add) { color: #e6cd84; }
.dock-divider { width: 1px; height: 22px; margin: 0 3px; background: #46434d; }
.cinema-widget-shell { container-type: inline-size; border-radius: 8px; background: #1b1a20; }
.cinema-widget-shell.cinema-widget-resizing { outline: 1px solid #766b4c; outline-offset: -1px; }
.cinema-widget-shell > .widget-titlebar { padding-inline: 16px; border-bottom: 1px solid #302e35; }
.cinema-widget-shell > .board-widget { padding-top: 8px; }
.cinema-widget-shell .youtube-list-action { height: 32px; min-height: 32px; max-height: 32px; padding-block: 0; }
@container (max-width: 640px) {
  .cinema-widget-shell .youtube-list-action { display: inline-grid; width: 32px; min-width: 32px; height: 32px; min-height: 32px; box-sizing: border-box; padding: 0; place-items: center; }
  .cinema-widget-shell .youtube-list-action-label { display: none; }
  .cinema-widget-shell .youtube-list-action .i-ph-arrow-up-right-bold { font-size: 14px; }
}
.editing .widget-title-actions { cursor: default; touch-action: auto; }
.editing .widget-title-actions button { cursor: pointer; }
.widget-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.widget-drag-handle { width: 28px; height: 32px; display: inline-grid; place-items: center; color: #d8c58f; cursor: grab; font-size: 20px; }
.widget-drag-handle:active { cursor: grabbing; }
.widget-body { flex: 1; min-height: 0; padding: 0 20px; }
.widget-body-youtube { padding-inline: 6px; }
.widget-controls { display: grid; gap: 16px; padding: 12px 0; }
.widget-controls label { display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 12px; color: #bdb8c5; }
select { background: #242329; border: 1px solid #55515d; border-radius: 3px; color: #ece9ee; height: 40px; width: 72px; }
.weather-content { display: flex; flex-direction: column; justify-content: center; height: 100%; gap: 16px; padding-bottom: 16px; }
.weather-summary { display: flex; align-items: center; gap: 14px; }
.temperature { font-size: clamp(28px, 3vw, 44px); letter-spacing: -2px; }
.weather-summary p { margin: 0 0 5px; }
.weather-summary div > span { color: #aaa7b2; font-size: 11px; }
.weather-icon { font-size: 32px; color: #d8c58f; margin-left: auto; }
.weather-range { display: flex; align-items: center; gap: 12px; font-size: 11px; color: #aaa7b2; }
.range-line { flex: 1; height: 4px; background: #a08b5b; border-radius: 4px; }
.weather-caption { color: #aaa7b2; font-size: 10px; margin: 0; }
.clocks { height: 100%; display: flex; flex-direction: column; justify-content: center; padding-bottom: 12px; }
.clocks > div { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 2px 0; border-bottom: 1px solid #303036; }
.clocks > div:last-child { border: 0; }
.clocks time { font-size: 23px; font-variant-numeric: tabular-nums; color: #d8c58f; }
.clocks span { color: #bdb8c5; font-size: 12px; }
.mobile-board { display: flex; flex-direction: column; gap: 20px; }
.page-footer { display: flex; justify-content: space-between; font-size: 11px; color: #aaa7b2; margin-top: 40px; padding: 20px 0; border-top: 1px solid #303036; }
.adjust-dialog { margin: auto; padding: 24px; width: min(480px, calc(100% - 32px)); border: 1px solid #444149; border-radius: 6px; background: #1a191f; color: #e3e0e7; }
.adjust-dialog p { color: #aaa7b2; font-size: 12px; }
.adjust-dialog::backdrop { background: #08080caa; }
.detail-heading { display: flex; gap: 20px; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.openrouter-detail-heading { margin-bottom: 0; }
.detail-heading h2 { text-transform: none; font: 22px system-ui; letter-spacing: 0; }
.openrouter-catalog-link { display: inline-block; margin-top: 8px; color: #aaa7b2; font: 12px/1.4 system-ui; }
:global(.widget-detail-dialog-overlay) { position: fixed; inset: 0; z-index: 49; background: #08080cbb; }
:global(.widget-detail-dialog-content) { z-index: 50; padding: 0; border: 1px solid #444149; border-radius: 12px; background: #19181e; color: #e3e0e7; }
:global(.widget-detail-dialog-overlay[data-state='open']) { animation: widget-detail-overlay-in 180ms ease-out both; }
:global(.widget-detail-dialog-overlay[data-state='closed']) { animation: widget-detail-overlay-out 140ms ease-in both; }
:global(.widget-detail-dialog-content[data-state='open']) { animation: widget-detail-dialog-in 240ms cubic-bezier(.2,.8,.2,1) both; }
:global(.widget-detail-dialog-content[data-state='closed']) { animation: widget-detail-dialog-out 160ms ease-in both; }
@keyframes widget-detail-overlay-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes widget-detail-overlay-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes widget-detail-dialog-in { from { opacity: 0; transform: translate(-50%, -48%) scale(.985); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
@keyframes widget-detail-dialog-out { from { opacity: 1; transform: translate(-50%, -50%) scale(1); } to { opacity: 0; transform: translate(-50%, -48%) scale(.985); } }
:deep(.vgl-item__resizer) { opacity: .95; width: 32px; height: 32px; cursor: se-resize; touch-action: none; user-select: none; }
:deep(.vgl-item--resizing), :deep(.vgl-item--dragging) { user-select: none; -webkit-user-select: none; }
.dashboard.grid-interacting, .dashboard.grid-interacting * { user-select: none; -webkit-user-select: none; }
.dialog-icon-button { width: 40px; padding: 0; display: inline-grid; place-items: center; font-size: 16px; }
:deep(.widget-picker-close) { width: 40px; height: 40px; min-height: 40px; padding: 0; border: 0; border-radius: 999px; background: transparent; color: #aaa7b2; transition: color 140ms ease, background-color 140ms ease; }
:deep(.widget-picker-close:hover) { background: #302e35; color: #e6cd84; }
.dialog-footer { display: flex; justify-content: flex-end; margin-top: 24px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

@media (max-width: 767px), (max-width: 900px) and (max-height: 500px) { .board-shell { padding: 12px 16px 128px; } .board-header { gap: 16px; flex-wrap: wrap; padding-bottom: 0; } .brand { font-size: 18px; } .dashboard-tabs { order: 1; width: 100%; height: 40px; gap: 24px; } .board-status { min-height: 38px; } .board-control-dock { bottom: calc(40px + env(safe-area-inset-bottom, 0px)); } }
@media (prefers-reduced-motion: reduce) { .board-control-dock { transition: none; } }
@media (prefers-reduced-motion: reduce) { :global(.widget-detail-dialog-overlay[data-state]), :global(.widget-detail-dialog-content[data-state]) { animation: none; } }
.empty-board { padding: 48px 24px; text-align: center; border: 1px dashed #444149; }
.empty-board button { margin-top: 24px; }
.widget-picker-header { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
.widget-picker-header h2 { margin: 0; text-transform: none; font: 22px/1.25 system-ui; letter-spacing: 0; }
.widget-catalog-search { display: flex; flex: 0 0 auto; align-items: center; gap: 10px; height: 40px; margin-bottom: 16px; padding: 0 12px; border: 1px solid #45424b; border-radius: 7px; background: #211f26; color: #aaa7b2; transition: border-color 140ms ease, background-color 140ms ease; }
.widget-catalog-search:focus-within { border-color: #a08b5b; background: #242229; }
.widget-catalog-search > span { flex: 0 0 auto; font-size: 17px; }
.widget-catalog-search input { width: 100%; height: 100%; min-width: 0; padding: 0; border: 0; outline: 0; background: transparent; color: #e3e0e7; font: 14px/1 system-ui, sans-serif; }
.widget-catalog-search input::placeholder { color: #85828c; }
.widget-catalog-search input::-webkit-search-cancel-button { cursor: pointer; }
.widget-catalog-scroll { min-height: 0; flex: 1 1 auto; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; padding: 2px 2px 4px; }
.widget-catalog { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.widget-catalog-card { display: flex; min-width: 0; align-items: flex-start; gap: 13px; padding: 13px; border: 0; border-radius: 9px; background: #222128; color: inherit; cursor: pointer; text-align: left; transition: background-color 150ms ease, transform 150ms ease; }
.widget-catalog-card:hover { background: #2a2830; transform: translateY(-1px); }
.widget-catalog-card:focus-visible { outline: 2px solid #e6cd84; outline-offset: 2px; }
.widget-catalog-illustration { display: grid; width: 42px; height: 42px; flex: 0 0 42px; place-items: center; border-radius: 10px; background: #302e36; color: #d8c58f; font-size: 21px; }
.widget-catalog-illustration.accent-rss { background: #302a25; color: #e2a86e; }
.widget-catalog-illustration.accent-youtube { background: #342628; color: #f08080; }
.widget-catalog-illustration.accent-github { background: #302f37; color: #d5d0df; }
.widget-catalog-illustration.accent-developers { background: #292d36; color: #9eb6e9; }
.widget-catalog-illustration.accent-news { background: #332d25; color: #e7bf72; }
.widget-catalog-illustration.accent-models { background: #2b2c38; color: #b8b1ed; }
.widget-catalog-illustration.accent-cinema { background: #342a2d; color: #e59c9e; }
.widget-catalog-illustration.accent-weather { background: #292f38; color: #9ac6df; }
.widget-catalog-illustration.accent-clock { background: #302d37; color: #c4afd9; }
.widget-catalog-copy { display: flex; min-width: 0; flex-direction: column; gap: 5px; }
.widget-catalog-title { color: #d8c58f; font: 15px/1.35 system-ui, sans-serif; }
.widget-catalog-description { color: #b3afba; font: 13px/1.45 system-ui, sans-serif; }
.widget-catalog-empty { margin: 0; padding: 28px 12px; color: #aaa7b2; font: 14px/1.5 system-ui, sans-serif; text-align: center; }
@media (max-width: 860px) { .widget-catalog { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 560px) { .widget-catalog { grid-template-columns: 1fr; } }
:global(.widget-picker-overlay) { position: fixed; inset: 0; z-index: 49; background: #08080caa; }
:global(.widget-picker-dialog-content) { position: fixed; top: 50%; left: 50%; z-index: 50; display: flex; box-sizing: border-box; width: min(1060px, calc(100vw - 32px)); height: min(82dvh, 720px); max-width: none; max-height: none; min-height: 260px; flex-direction: column; overflow: hidden; overscroll-behavior: contain; padding: 24px; border: 1px solid #444149; border-radius: 12px; background: #1a191f; color: #e3e0e7; transform: translate(-50%, -50%); }
:global(.widget-picker-dialog-content #picker-title:focus) { outline: none; }
:global(.tooltip-content.widget-picker-tooltip) { border: 1px solid #45424b; border-radius: 6px; background: #2a2830; color: #e3e0e7; padding: 6px 10px; font: 12px/1.4 system-ui, sans-serif; box-shadow: 0 4px 12px #0008; }
:global(.widget-picker-dialog-content[data-state='open']) { animation: widget-picker-dialog-in 180ms ease-out both; }
:global(.widget-picker-dialog-content[data-state='closed']) { animation: widget-picker-dialog-out 140ms ease-in both; }
:global(.widget-picker-overlay[data-state='open']) { animation: widget-picker-overlay-in 160ms ease-out both; }
:global(.widget-picker-overlay[data-state='closed']) { animation: widget-picker-overlay-out 120ms ease-in both; }
@keyframes widget-picker-overlay-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes widget-picker-overlay-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes widget-picker-dialog-in { from { opacity: 0; transform: translate(-50%, -48%) scale(.985); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
@keyframes widget-picker-dialog-out { from { opacity: 1; transform: translate(-50%, -50%) scale(1); } to { opacity: 0; transform: translate(-50%, -48%) scale(.985); } }
@media (max-width: 560px) { :global(.widget-picker-dialog-content) { width: calc(100vw - 24px); height: min(86dvh, 720px); padding: 18px; } .widget-catalog { grid-template-columns: 1fr; gap: 8px; } .widget-catalog-card { padding: 12px; } }
@media (prefers-reduced-motion: reduce) { :global(.widget-picker-dialog-content[data-state]), :global(.widget-picker-overlay[data-state]) { animation: none; } }
</style>
