<template>
  <main class="dashboard">
    <div class="board-shell">
      <header class="board-header">
        <NuxtLink to="/" class="brand">encascade<span>↘</span></NuxtLink>
        <span class="board-tab">Quotidien</span>
        <div class="header-actions">
          <template v-if="editing">
            <NTooltip content="Annuler la dernière modification">
              <NButton type="button" icon label="i-ph-arrow-arc-left-bold" btn="ghost" class="header-icon-button" aria-label="Annuler la dernière modification" :disabled="!store.history.length" @click="store.undo" />
            </NTooltip>
            <NButton type="button" btn="solid" leading="i-ph-plus-bold" class="header-add-button" :disabled="store.widgets.length >= 24" @click="picker?.showModal()">Widget</NButton>
          </template>
          <NTooltip :content="editing ? 'Terminer le mode édition (E)' : 'Modifier le tableau (E)'">
            <NButton type="button" btn="soft" class="edit-button" aria-keyshortcuts="E" :aria-pressed="editing" @click="toggleEditing">{{ editing ? 'Terminer' : 'Modifier le tableau' }}</NButton>
          </NTooltip>
        </div>
      </header>
      <div class="board-status">
        <p v-if="editing">{{ mobile ? 'Configurez vos widgets depuis leur menu.' : 'Déplacez-les par leur poignée. Ouvrez le menu pour les configurer.' }}</p>
        <span class="sr-only" role="status">{{ store.message }}</span>
      </div>
      <template v-if="store.ready">
        <div v-if="!store.widgets.length" class="empty-board"><h2>Votre tableau attend ses premières sources.</h2><button class="native-button" @click="editing = true; picker?.showModal()">Ajouter un widget</button></div>
        <GridLayout v-else-if="!mobile" ref="grid" :layout="layout" :col-num="12" :row-height="40" :gap="gridGap" :is-draggable="editing" :is-resizable="editing" :resize-config="resizeConfig" @update:layout="store.setLayout" @error="store.message = 'La grille a rencontré une erreur'" @operation-rejected="store.message = 'Cette position ou dimension n’est pas disponible'">
          <GridItem v-for="widget in store.widgets" :key="widget.id" :i="widget.id" drag-allow-from=".widget-drag-handle" :resize-option="resizeOption" class="board-grid-item">
            <div class="widget-shell">
              <header class="widget-titlebar">
                <NTooltip :content="widget.title"><h2>{{ widget.title }}</h2></NTooltip>
                <div class="widget-title-actions">
                  <NButton v-if="widget.type === 'youtube' && youtubeAvailable.has(widget.id)" type="button" btn="ghost" class="youtube-list-action" @click="readMore(widget.id)">
                    Voir la liste complète <span class="i-ph-arrow-up-right-bold" aria-hidden="true" />
                  </NButton>
                  <div v-if="editing" class="widget-actions">
                    <BoardWidgetActionsMenu @configure="configure(widget)" @adjust="openAdjustments(widget.id)" />
                    <NTooltip content="Déplacer le widget"><span class="widget-drag-handle" aria-label="Déplacer le widget" aria-hidden="true"><span class="i-ph-dots-six-vertical-bold" /></span></NTooltip>
                  </div>
                </div>
              </header>
              <article class="board-widget" :class="[{ editing }, { 'youtube-widget': widget.type === 'youtube' }]" :aria-label="widget.title">
                <div class="widget-body" :class="{ 'widget-body-youtube': widget.type === 'youtube' }">
                  <BoardContent :widget="widget" @more="readMore(widget.id)" @availability="setYoutubeAvailability(widget.id, $event)" />
                </div>
              </article>
            </div>
          </GridItem>
        </GridLayout>
        <div v-else class="mobile-board">
          <div v-for="widget in ordered" :key="widget.id" class="widget-shell" :style="{ height: widget.type === 'rss' ? '486px' : '306px' }">
            <header class="widget-titlebar">
              <NTooltip :content="widget.title"><h2>{{ widget.title }}</h2></NTooltip>
              <div class="widget-title-actions">
                <NButton v-if="widget.type === 'youtube' && youtubeAvailable.has(widget.id)" type="button" btn="ghost" class="youtube-list-action" @click="readMore(widget.id)">
                  Voir la liste complète <span class="i-ph-arrow-up-right-bold" aria-hidden="true" />
                </NButton>
                <BoardWidgetActionsMenu v-if="editing" @configure="configure(widget)" @adjust="openAdjustments(widget.id)" />
              </div>
            </header>
            <article class="board-widget" :class="[{ editing }, { 'youtube-widget': widget.type === 'youtube' }]" :aria-label="widget.title">
              <div class="widget-body" :class="{ 'widget-body-youtube': widget.type === 'youtube' }">
                <BoardContent :widget="widget" @more="readMore(widget.id)" @availability="setYoutubeAvailability(widget.id, $event)" />
              </div>
            </article>
          </div>
        </div>
      </template>
  </div>
    <BoardSettings v-if="settings" :key="settings.id" :widget="settings" :is-new="isNew" @save="save" @close="settings = undefined" @remove="remove" />
    <dialog ref="picker" class="adjust-dialog" aria-labelledby="picker-title" @click="($event.target === picker) && picker?.close()">
      <div class="detail-heading"><h2 id="picker-title">Ajouter un widget</h2><NTooltip content="Fermer"><button class="native-button" autofocus aria-label="Fermer le catalogue" @click="picker?.close()">Fermer ×</button></NTooltip></div>
      <div class="widget-catalog"><button class="native-button" @click="add('rss')">Actualités RSS <small>Les derniers articles de vos sites préférés</small></button><button class="native-button" @click="add('youtube')">Vidéos YouTube <small>Les dernières vidéos d’une chaîne</small></button><button class="native-button" @click="add('weather')">Météo <small>Les conditions et températures de votre ville</small></button><button class="native-button" @click="add('clock')">Horloges <small>L’heure dans une à trois villes</small></button></div>
    </dialog>
    <dialog ref="adjustments" class="adjust-dialog" aria-labelledby="adjust-title" @click="($event.target === adjustments) && adjustments?.close()">
      <div class="detail-heading"><h2 id="adjust-title">Ajuster · {{ adjustedItem?.title }}</h2><NTooltip content="Fermer"><button class="native-button dialog-icon-button" autofocus aria-label="Fermer les ajustements" @click="adjustments?.close()"><span class="i-ph-x-bold" aria-hidden="true" /></button></NTooltip></div>
      <p>Une alternative au glisser-déposer, utilisable au clavier.</p>
      <div v-if="adjustedItem" class="widget-controls">
        <label>Largeur (colonnes)<select aria-label="Largeur du widget" :value="adjustedItem.w" @change="resize('w', ($event.target as HTMLSelectElement).value)"><option v-for="n in 10" :key="n" :value="n + 2">{{ n + 2 }}</option></select></label>
        <label>Hauteur (crans)<select aria-label="Hauteur du widget" :value="adjustedItem.h" @change="resize('h', ($event.target as HTMLSelectElement).value)"><option v-for="n in 13" :key="n" :value="n + 3">{{ n + 3 }}</option></select></label>
      </div>
      <footer class="dialog-footer"><NButton type="button" btn="soft" @click="adjustments?.close()">Terminer</NButton></footer>
    </dialog>
    <NDrawer
      v-model:open="detailOpen"
      direction="right"
      :title="detailWidget?.title ?? 'Actualités'"
      :description="detailWidget?.type === 'youtube' ? 'Toutes les vidéos récentes de cette chaîne' : 'Tous les articles du flux RSS'"
      :una="{ drawerContent: 'data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-[640px] border-l border-[#444149] bg-[#1a191f] p-0 text-[#e3e0e7] rounded-none' }"
    >
      <template #title>{{ detailWidget?.title ?? 'Actualités' }}</template>
      <template #content>
        <div class="flex h-full min-h-0 flex-col">
          <header class="detail-heading shrink-0 border-b border-[#303036] px-5 py-6 sm:px-7">
            <div><p class="eyebrow">{{ detailWidget?.type === 'youtube' ? 'VIDÉOS RÉCENTES' : 'TOUS LES ARTICLES' }}</p><h2>{{ detailWidget?.title }}</h2></div>
            <NTooltip content="Fermer">
              <NDrawerClose as-child>
                <NButton type="button" btn="ghost" square="10" icon label="i-ph-x-bold" aria-label="Fermer les actualités" />
              </NDrawerClose>
            </NTooltip>
          </header>
          <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
            <BoardFeed v-if="detailWidget?.feedUrl" :feed-url="detailWidget.feedUrl" expanded />
            <BoardYouTube v-else-if="detailWidget?.type === 'youtube' && detailWidget.channelId" :channel-id="detailWidget.channelId" :grayscale="detailWidget.grayscale ?? false" expanded />
          </div>
        </div>
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
import type { BoardWidget, WidgetKind } from '~/utils/boardConfig'
const store = useBoardStore()
const resizeConfig: ResizeConfig = { handles: ['se'] }
const resizeOption = { hold: 120 }
const gridGap: [number, number] = [20, 20]
const grid = ref<GridLayoutExpose>()
const editing = ref(false)
const mobile = ref(false)
const adjustments = ref<HTMLDialogElement>()
const adjustedId = ref('')
const adjustedItem = computed(() => store.widgets.find(w => w.id === adjustedId.value))
const settings = ref<BoardWidget>()
const isNew = ref(false)
const picker = ref<HTMLDialogElement>()
const detailId = ref('')
const detailWidget = computed(() => store.widgets.find(w => w.id === detailId.value))
const detailOpen = ref(false)
const youtubeAvailable = ref(new Set<string>())
const layout = computed<Layout>(() => store.widgets.map(w => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h, minW: 3, minH: 4, maxH: 16 })))
const ordered = computed(() => [...store.widgets].sort((a, b) => a.y - b.y || a.x - b.x))
let media: MediaQueryList
const syncMobile = () => { mobile.value = media.matches }
function toggleEditing() { editing.value = !editing.value }
function isInteractiveTarget(target: EventTarget | null) {
  const element = target instanceof HTMLElement ? target : null
  return Boolean(element?.closest('input, textarea, select, button, a, summary, [contenteditable="true"]'))
}
const shortcuts: Record<string, () => void> = { e: toggleEditing }
function handleShortcut(event: KeyboardEvent) {
  const action = shortcuts[event.key.toLowerCase()]
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || !action) return
  if (isInteractiveTarget(event.target) || document.querySelector('dialog[open], details[open]')) return
  event.preventDefault()
  action()
}
onMounted(() => { store.init(); media = matchMedia('(max-width: 767px)'); syncMobile(); media.addEventListener('change', syncMobile); window.addEventListener('keydown', handleShortcut) })
onBeforeUnmount(() => { media?.removeEventListener('change', syncMobile); window.removeEventListener('keydown', handleShortcut) })
function configure(widget: BoardWidget) { isNew.value = false; settings.value = JSON.parse(JSON.stringify(widget)) }
function add(type: WidgetKind) { picker.value?.close(); isNew.value = true; settings.value = widgetDefaults(type, crypto.randomUUID()) }
function save(widget: BoardWidget) { if (store.saveWidget(widget)) settings.value = undefined }
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
.board-shell { max-width: 1440px; margin: auto; padding: 24px 32px; }
.board-header { display: flex; align-items: center; gap: 36px; min-height: 62px; border-bottom: 1px solid #303036; }
.brand { color: #ece9ee; font-size: 20px; letter-spacing: -1px; text-decoration: none; }
.brand span { margin-left: 8px; color: #d8c58f; }
.board-tab { align-self: stretch; display: flex; align-items: center; border-bottom: 2px solid #d8c58f; }
.header-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.native-button { font: inherit; color: #d8c58f; border: 1px solid #444149; border-radius: 4px; padding: 9px 12px; background: transparent; cursor: pointer; min-height: 40px; }
.native-button:disabled { opacity: .45; cursor: default; }
.native-button:hover:not(:disabled) { background: #29282e; }
.native-button:focus-visible, select:focus-visible, a:focus-visible { outline: 2px solid #d8c58f; outline-offset: 3px; }
.header-icon-button { width: 40px; height: 40px; min-height: 40px; padding: 0; display: inline-grid; place-items: center; font-size: 18px; }
.header-add-button, .edit-button { min-height: 40px; }
.eyebrow { font-size: 10px; letter-spacing: 1.3px; color: #b0a5a0; margin: 0 0 10px; }
.board-status { min-height: 42px; display: flex; align-items: center; color: #aaa7b2; font-size: 11px; margin-bottom: 16px; }
.board-status p { margin: 0; }
.widget-shell { height: 100%; min-height: 0; display: flex; flex-direction: column; }
.board-widget { flex: 1 1 auto; min-height: 0; border: 1px solid #303036; background: #1a191f; border-radius: 6px; display: flex; flex-direction: column; overflow: hidden; }
.board-widget.editing { border-color: #766b4c; }
.board-widget.youtube-widget { border: 0; background: transparent; border-radius: 0; }
.widget-titlebar h2 { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.widget-titlebar { gap: 10px; display: flex; align-items: center; justify-content: space-between; flex: 0 0 40px; padding: 0 6px; }
.editing .widget-titlebar { cursor: grab; touch-action: none; }
h2 { font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; margin: 0; color: #bdb8c5; }
.widget-title-actions { display: flex; min-width: 0; flex-shrink: 0; align-items: center; justify-content: flex-end; gap: 8px; }
.youtube-list-action { min-height: 40px; padding-inline: 8px; color: #aaa7b2; font: inherit; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; }
.youtube-list-action:hover { color: #d8c58f; }
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
.detail-heading h2 { text-transform: none; font: 22px system-ui; letter-spacing: 0; }
:deep(.vgl-item__resizer) { opacity: .95; width: 32px; height: 32px; cursor: se-resize; touch-action: none; user-select: none; }
:deep(.vgl-item--resizing), :deep(.vgl-item--dragging) { user-select: none; -webkit-user-select: none; }
.editing .board-grid-item { user-select: none; -webkit-user-select: none; }
.dialog-icon-button { width: 40px; padding: 0; display: inline-grid; place-items: center; font-size: 16px; }
.dialog-footer { display: flex; justify-content: flex-end; margin-top: 24px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

@media (max-width: 767px) { .board-shell { padding: 12px 16px; } .board-header { gap: 16px; flex-wrap: wrap; padding-bottom: 12px; } .brand { font-size: 18px; } .board-tab { display: none; } .header-actions { width: 100%; } .header-actions .edit-button { margin-left: auto; } .edit-button, .header-add-button { font-size: 11px; } .board-status { min-height: 38px; } }
.empty-board { padding: 48px 24px; text-align: center; border: 1px dashed #444149; }
.empty-board button { margin-top: 24px; }
.widget-catalog { display: grid; gap: 12px; }
.widget-catalog button { text-align: left; padding: 16px; }
.widget-catalog small { display: block; color: #aaa7b2; margin-top: 6px; font-size: 11px; }
</style>
