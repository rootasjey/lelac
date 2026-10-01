<script setup lang="ts">
import { createConfigurationBundle, parseConfigurationBundle } from '~/utils/configTransfer'
import type { ThemePreference } from '~/utils/configTransfer'
import { dashboardIds } from '~/utils/boardConfig'

const colorMode = useColorMode()
const boardStore = useBoardStore()
const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const showResetConfirmation = ref(false)
const resetDialog = ref<HTMLDialogElement>()
const resetError = ref('')
const transferMessage = ref('')
const importFileInput = ref<HTMLInputElement>()
const importDialog = ref<HTMLDialogElement>()
const showImportConfirmation = ref(false)
const pendingImport = ref<ReturnType<typeof parseConfigurationBundle>>(null)
const activeTheme = computed(() => colorMode.preference)
const pendingImportSummary = computed(() => pendingImport.value
  ? dashboardIds.map((id) => `${dashboardLabel[id]} : ${pendingImport.value!.dashboards[id].widgets.length} widget${pendingImport.value!.dashboards[id].widgets.length === 1 ? '' : 's'}`).join(' · ')
  : '')
const dashboardLabel = { daily: 'Quotidien', tech: 'Tech', cinema: 'Cinéma' } as const
const returnToBoard = computed(() => {
  const routeBoard = route.query.board
  const board = routeBoard === 'tech' || routeBoard === 'cinema' ? routeBoard : boardStore.activeDashboard
  return board === 'daily' ? '/' : `/?board=${board}`
})

useHead({ title: 'Paramètres — Encascade' })

watch(showResetConfirmation, async (show) => {
  await nextTick()
  const dialog = resetDialog.value
  if (show && dialog && !dialog.open) dialog.showModal()
  else if (!show && dialog?.open) dialog.close()
})

watch(showImportConfirmation, async (show) => {
  await nextTick()
  const dialog = importDialog.value
  if (show && dialog && !dialog.open) dialog.showModal()
  else if (!show && dialog?.open) dialog.close()
})

function setTheme(theme: 'system' | 'dark' | 'light') {
  colorMode.preference = theme
}

function currentThemePreference(): ThemePreference {
  return colorMode.preference === 'system' || colorMode.preference === 'light' ? colorMode.preference : 'dark'
}

function resetDispositions() {
  if (!boardStore.resetDispositions()) {
    resetError.value = boardStore.message || 'Les tableaux n’ont pas pu être réinitialisés.'
    return
  }
  resetError.value = ''
  showResetConfirmation.value = false
}

function exportConfiguration() {
  try {
    const bundle = createConfigurationBundle(currentThemePreference(), boardStore.readAllDashboards())
    const blob = new Blob([`${JSON.stringify(bundle, null, 2)}\n`], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `encascade-configuration-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    transferMessage.value = 'Configuration exportée.'
  } catch (error) {
    transferMessage.value = error instanceof Error ? error.message : 'La configuration n’a pas pu être exportée.'
  }
}

async function readConfigurationFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  transferMessage.value = ''
  if (file.size > 2 * 1024 * 1024) {
    transferMessage.value = 'Ce fichier dépasse la taille maximale de 2 Mo.'
    return
  }
  try {
    const parsed = parseConfigurationBundle(JSON.parse(await file.text()))
    if (!parsed) throw new Error('Fichier invalide ou version de configuration non prise en charge.')
    pendingImport.value = parsed
    showImportConfirmation.value = true
  } catch (error) {
    transferMessage.value = error instanceof Error ? error.message : 'Ce fichier n’a pas pu être lu.'
  }
}

function importConfiguration() {
  const bundle = pendingImport.value
  if (!bundle) return
  if (!boardStore.replaceAllDashboards(bundle.dashboards)) {
    transferMessage.value = boardStore.message || 'La configuration n’a pas pu être importée.'
    return
  }
  colorMode.preference = bundle.appearance.theme
  pendingImport.value = null
  showImportConfirmation.value = false
  transferMessage.value = 'Configuration importée.'
}
</script>

<template>
  <main class="settings-page">
    <div class="settings-shell">
      <header class="settings-header">
        <NuxtLink to="/" class="settings-brand">encascade<span>↘</span></NuxtLink>
        <NuxtLink :to="returnToBoard" class="settings-back"><span class="i-ph-arrow-left" aria-hidden="true" />Retour au tableau</NuxtLink>
      </header>

      <section class="settings-content" aria-labelledby="settings-page-title">
        <p class="settings-kicker">VOTRE ESPACE</p>
        <h1 id="settings-page-title">Paramètres</h1>
        <p class="settings-intro">Réglez l’apparence et retrouvez une disposition propre à tout moment.</p>

        <section class="settings-section" aria-labelledby="appearance-heading">
          <div class="section-heading">
            <h2 id="appearance-heading">Apparence</h2>
            <p>Le thème s’applique à tous vos tableaux.</p>
          </div>
          <div class="setting-row theme-row">
            <div class="setting-copy">
              <h3>Thème</h3>
              <p>Choisissez un thème ou suivez l’apparence de votre appareil.</p>
            </div>
            <div class="theme-options" role="group" aria-label="Thème de l’application">
              <button type="button" :aria-pressed="activeTheme === 'system'" :class="{ selected: activeTheme === 'system' }" @click="setTheme('system')">
                <span class="theme-swatch theme-swatch-system" aria-hidden="true" />
                Système
              </button>
              <button type="button" :aria-pressed="activeTheme === 'dark'" :class="{ selected: activeTheme === 'dark' }" @click="setTheme('dark')">
                <span class="theme-swatch theme-swatch-dark" aria-hidden="true"><span /></span>
                Sombre
              </button>
              <button type="button" :aria-pressed="activeTheme === 'light'" :class="{ selected: activeTheme === 'light' }" @click="setTheme('light')">
                <span class="theme-swatch theme-swatch-light" aria-hidden="true"><span /></span>
                Clair
              </button>
            </div>
          </div>
        </section>

        <section class="settings-section" aria-labelledby="boards-heading">
          <div class="section-heading">
            <h2 id="boards-heading">Tableaux</h2>
            <p>Cette action restaure les dispositions de Quotidien, Tech et Cinéma.</p>
          </div>
          <div class="setting-row reset-row">
            <div class="setting-copy">
              <h3>Disposition initiale</h3>
              <p>Vos tableaux personnalisés et leurs réglages de widgets seront remplacés.</p>
            </div>
            <button type="button" class="reset-button" @click="showResetConfirmation = true">Réinitialiser les tableaux</button>
          </div>
          <p v-if="resetError" class="settings-error" role="alert">{{ resetError }}</p>
        </section>

        <section class="settings-section" aria-labelledby="backup-heading">
          <div class="section-heading">
            <h2 id="backup-heading">Sauvegarde</h2>
            <p>Transférez vos préférences vers un autre navigateur ou appareil.</p>
          </div>
          <div class="setting-row transfer-row">
            <div class="setting-copy">
              <h3>Configuration Encascade</h3>
              <p>Inclut le thème, les widgets et les réglages de vos {{ dashboardIds.length }} tableaux.</p>
            </div>
            <div class="transfer-actions">
              <button type="button" class="reset-button" @click="exportConfiguration">Exporter</button>
              <button type="button" class="reset-button" @click="importFileInput?.click()">Importer</button>
              <input ref="importFileInput" class="sr-only" type="file" accept=".json,application/json" aria-label="Choisir un fichier de configuration" @change="readConfigurationFile">
            </div>
          </div>
          <p class="transfer-note">Le fichier contient vos URL de flux et vos villes. Il ne contient ni données chargées depuis les sources ni clés API.</p>
          <p v-if="transferMessage" class="transfer-message" role="status">{{ transferMessage }}</p>
        </section>

        <section class="settings-section about-section" aria-labelledby="about-heading">
          <div class="section-heading">
            <h2 id="about-heading">À propos</h2>
          </div>
          <div class="setting-row version-row">
            <div class="setting-copy">
              <h3>Version de l’application</h3>
              <p>Build actuellement exécuté.</p>
            </div>
            <code>{{ runtimeConfig.public.appVersion || 'dev' }}</code>
          </div>
        </section>

        <footer class="settings-footer">Les préférences sont enregistrées dans ce navigateur.</footer>
      </section>
    </div>

    <dialog ref="resetDialog" class="reset-confirmation" aria-labelledby="reset-title" @cancel.prevent="showResetConfirmation = false" @click="($event.target === $event.currentTarget) && (showResetConfirmation = false)">
      <h2 id="reset-title">Réinitialiser les tableaux ?</h2>
      <p>Les trois tableaux retrouveront leur disposition initiale. Cette action ne peut pas être annulée.</p>
      <footer>
        <button type="button" class="cancel-button" @click="showResetConfirmation = false">Annuler</button>
        <button type="button" class="confirm-button" @click="resetDispositions">Réinitialiser</button>
      </footer>
    </dialog>
    <dialog ref="importDialog" class="reset-confirmation" aria-labelledby="import-title" @cancel.prevent="showImportConfirmation = false" @click="($event.target === $event.currentTarget) && (showImportConfirmation = false)">
      <h2 id="import-title">Importer cette configuration ?</h2>
      <p>Le thème et les {{ dashboardIds.length }} tableaux de cette application seront remplacés par le contenu du fichier.</p>
      <p class="import-summary">{{ pendingImportSummary }}</p>
      <footer>
        <button type="button" class="cancel-button" @click="showImportConfirmation = false">Annuler</button>
        <button type="button" class="confirm-button" @click="importConfiguration">Importer</button>
      </footer>
    </dialog>
  </main>
</template>

<style scoped>
.settings-page { min-height: 100vh; background: var(--board-canvas); color: var(--board-text); font: 14px/1.55 system-ui, -apple-system, sans-serif; }
.settings-shell { width: min(100%, 1080px); margin-inline: auto; padding: 24px 36px 96px; }
.settings-header { display: flex; min-height: 62px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--board-border); }
.settings-brand { color: var(--board-text); font: 20px/1 'SF Mono', 'Cascadia Code', Consolas, monospace; letter-spacing: -.06em; text-decoration: none; }
.settings-brand span { margin-left: 8px; color: var(--board-accent); }
.settings-back { display: inline-flex; min-height: 40px; align-items: center; gap: 8px; color: var(--board-text-soft); font: 12px/1 'SF Mono', 'Cascadia Code', Consolas, monospace; text-decoration: none; }
.settings-back:hover { color: var(--board-accent); }
.settings-content { width: min(100%, 760px); margin: 64px auto 0; }
.settings-kicker { margin: 0 0 10px; color: var(--board-text-dim); font: 11px/1.3 'SF Mono', 'Cascadia Code', Consolas, monospace; letter-spacing: .12em; }
h1 { margin: 0; color: var(--board-text); font: 500 clamp(32px, 5vw, 46px)/1.12 Georgia, serif; letter-spacing: -.025em; }
.settings-intro { margin: 12px 0 0; color: var(--board-text-muted); font-size: 15px; }
.settings-section { margin-top: 42px; }
.section-heading { margin-bottom: 14px; }
.section-heading h2 { margin: 0; color: var(--board-text); font-size: 17px; font-weight: 600; }
.section-heading p { margin: 4px 0 0; color: var(--board-text-muted); font-size: 13px; }
.setting-row { display: flex; min-height: 88px; align-items: center; justify-content: space-between; gap: 24px; padding: 18px 20px; border-radius: 10px; background: var(--board-surface); }
.setting-copy { min-width: 0; }
.setting-copy h3 { margin: 0; color: var(--board-text); font-size: 14px; font-weight: 550; }
.setting-copy p { margin: 5px 0 0; color: var(--board-text-muted); font-size: 12px; line-height: 1.5; }
.theme-options { display: flex; flex: 0 0 auto; gap: 8px; }
.theme-options button { display: flex; min-width: 96px; min-height: 40px; align-items: center; justify-content: center; gap: 8px; padding: 0 12px; border: 1px solid var(--board-border); border-radius: 7px; background: transparent; color: var(--board-text-soft); font: 12px/1 system-ui, sans-serif; cursor: pointer; }
.theme-options button:hover { background: var(--board-hover); }
.theme-options button.selected { border-color: var(--board-accent); background: color-mix(in srgb, var(--board-accent) 10%, var(--board-surface)); color: var(--board-accent); }
.theme-swatch { display: grid; width: 17px; height: 17px; place-items: center; overflow: hidden; border: 1px solid var(--board-border-strong); border-radius: 50%; }
.theme-swatch span { width: 100%; height: 100%; border-radius: 50%; }
.theme-swatch-dark { background: #242129; }
.theme-swatch-dark span { width: 50%; border-radius: 0 50% 50% 0; background: #e7d8ae; }
.theme-swatch-light { background: #f2efe8; }
.theme-swatch-light span { width: 50%; border-radius: 0 50% 50% 0; background: #725b22; }
.theme-swatch-system { background: linear-gradient(90deg, #242129 0 50%, #f2efe8 50%); }
.reset-button, .cancel-button, .confirm-button { display: inline-flex; min-height: 40px; align-items: center; justify-content: center; padding: 0 14px; border: 1px solid var(--board-border-strong); border-radius: 6px; background: transparent; color: var(--board-text-soft); font: 12px/1 system-ui, sans-serif; cursor: pointer; }
.reset-button:hover, .cancel-button:hover { background: var(--board-hover); color: var(--board-text); }
.about-section { padding-top: 2px; border-top: 1px solid var(--board-border); }
.about-section .section-heading { margin-top: 24px; }
.version-row { min-height: 72px; }
.version-row code { padding: 6px 9px; border-radius: 5px; background: var(--board-surface-raised); color: var(--board-text-soft); font: 12px/1.3 'SF Mono', 'Cascadia Code', Consolas, monospace; }
.settings-footer { margin-top: 28px; color: var(--board-text-dim); font: 11px/1.4 'SF Mono', 'Cascadia Code', Consolas, monospace; }
.settings-error { margin: 12px 2px 0; color: #a63f36; font-size: 12px; }
.transfer-row { min-height: 88px; }
.transfer-actions { display: flex; flex: 0 0 auto; gap: 8px; }
.transfer-note, .transfer-message { margin: 10px 2px 0; color: var(--board-text-dim); font-size: 11px; line-height: 1.5; }
.transfer-message { color: var(--board-text-muted); }
.import-summary { padding: 10px 12px; border-radius: 6px; background: var(--board-surface-raised); }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.reset-confirmation { position: fixed; inset: 0; width: min(440px, calc(100vw - 32px)); margin: auto; padding: 24px; border: 1px solid var(--board-border-strong); border-radius: 11px; background: var(--board-surface-dialog); color: var(--board-text); box-shadow: 0 24px 80px #0004; }
.reset-confirmation::backdrop { background: var(--board-overlay); backdrop-filter: blur(3px); }
.reset-confirmation h2 { margin: 0; color: var(--board-text); font: 20px/1.3 system-ui, sans-serif; }
.reset-confirmation p { margin: 12px 0 0; color: var(--board-text-muted); font-size: 13px; }
.reset-confirmation footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
.confirm-button { border-color: var(--board-accent); background: var(--board-accent); color: var(--board-canvas); }
.confirm-button:hover { filter: brightness(.95); }
.settings-page :focus-visible, .reset-confirmation :focus-visible { outline: 2px solid var(--board-accent-bright); outline-offset: 3px; }
@media (max-width: 620px) {
  .settings-shell { padding: 12px 18px 90px; }
  .settings-content { margin-top: 42px; }
  .settings-section { margin-top: 32px; }
  .setting-row { align-items: flex-start; flex-direction: column; gap: 16px; padding: 16px; }
  .theme-options { width: 100%; }
  .theme-options button { min-width: 0; flex: 1; padding-inline: 8px; }
  .transfer-actions { width: 100%; }
  .transfer-actions button { flex: 1; }
}
</style>
