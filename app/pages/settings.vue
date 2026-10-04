<script setup lang="ts">
import { createConfigurationBundle, parseConfigurationBundle } from '~/utils/configTransfer'
import type { ThemePreference } from '~/utils/configTransfer'
import { dashboardListStorageKey, dashboardStorageKey, dashboardStorageOwnerKey } from '~/utils/boardConfig'
import { accountDashboardPath, accountHomePath, normalizeAccountHandle } from '~~/shared/utils/accountHandle'

const colorMode = useColorMode()
const boardStore = useBoardStore()
const authSession = useUserSession()
const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const showResetConfirmation = ref(false)
const resetDialog = ref<HTMLDialogElement>()
const resetError = ref('')
const showDeleteConfirmation = ref(false)
const deleteDialog = ref<HTMLDialogElement>()
const deletePassword = ref('')
const deletePhrase = ref('')
const deleteError = ref('')
const deletingAccount = ref(false)
const transferMessage = ref('')
const handleDraft = ref('')
const handleMessage = ref('')
const handleError = ref('')
const handleReady = ref(false)
const savingHandle = ref(false)
const importFileInput = ref<HTMLInputElement>()
const importDialog = ref<HTMLDialogElement>()
const showImportConfirmation = ref(false)
const pendingImport = ref<ReturnType<typeof parseConfigurationBundle>>(null)
const activeTheme = computed(() => colorMode.preference)
const pendingImportSummary = computed(() => pendingImport.value
  ? pendingImport.value.dashboards.map(dashboard => `${dashboard.title} : ${dashboard.config.widgets.length} widget${dashboard.config.widgets.length === 1 ? '' : 's'}`).join(' · ')
  : '')
const returnToBoard = computed(() => {
  const routeBoard = route.query.board
  const board = typeof routeBoard === 'string' && boardStore.dashboards.some(item => item.id === routeBoard)
    ? routeBoard
    : boardStore.activeDashboard
  if (boardStore.accountHandle) return accountDashboardPath(boardStore.accountHandle, board, boardStore.dashboards[0]?.id ?? 'daily')
  return '/'
})
const accountHomeUrl = computed(() => {
  const handle = boardStore.accountHandle || normalizeAccountHandle(handleDraft.value)
  return handle ? accountHomePath(handle) : ''
})

useHead({ title: 'Paramètres — Le Lac' })

onMounted(async () => {
  const queryBoard = route.query.board
  boardStore.init(typeof queryBoard === 'string' ? queryBoard : undefined)
  handleDraft.value = boardStore.accountHandle
  await boardStore.syncWithAccount()
  handleDraft.value = boardStore.accountHandle
  handleReady.value = true
})

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await authSession.clear()
  boardStore.disableRemoteSync()
  await navigateTo('/login')
}

async function saveAccountHandle() {
  handleError.value = ''
  handleMessage.value = ''
  const handle = normalizeAccountHandle(handleDraft.value)
  if (!handle) {
    handleError.value = 'Utilisez 3 à 36 lettres sans accent, chiffres ou tirets.'
    return
  }

  savingHandle.value = true
  try {
    const result = await $fetch<{ handle: string }>('/api/account/handle', { method: 'PUT', body: { handle } })
    handleDraft.value = result.handle
    boardStore.setAccountHandle(result.handle)
    handleMessage.value = 'Votre adresse de compte a été mise à jour.'
  } catch (error) {
    const fetchError = error as { data?: { statusMessage?: string }; statusMessage?: string }
    handleError.value = fetchError.data?.statusMessage || fetchError.statusMessage || 'Le pseudo n’a pas pu être enregistré.'
  } finally {
    savingHandle.value = false
  }
}

async function deleteAccount() {
  deleteError.value = ''
  if (deletePhrase.value !== 'SUPPRIMER') {
    deleteError.value = 'Saisissez SUPPRIMER pour confirmer.'
    return
  }

  deletingAccount.value = true
  try {
    await $fetch('/api/auth/account', {
      method: 'DELETE',
      body: { password: deletePassword.value, confirmation: deletePhrase.value },
    })
    boardStore.disableRemoteSync()
    await authSession.clear()
    for (const dashboard of boardStore.dashboards) {
      const id = dashboard.id
      try { localStorage.removeItem(dashboardStorageKey(id)) } catch { /* The remote account was already deleted. */ }
    }
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('lelac:board:v1:') || key === dashboardListStorageKey || key === dashboardStorageOwnerKey) localStorage.removeItem(key)
      }
    } catch { /* The account was removed remotely; clear any remaining local data when available. */ }
    deletePassword.value = ''
    deletePhrase.value = ''
    showDeleteConfirmation.value = false
    await navigateTo('/login?account-deleted=1')
  } catch (error) {
    const fetchError = error as { data?: { statusMessage?: string }; statusMessage?: string }
    deleteError.value = fetchError.data?.statusMessage || fetchError.statusMessage || 'Le compte n’a pas pu être supprimé.'
  } finally {
    deletingAccount.value = false
  }
}

watch(showResetConfirmation, async (show) => {
  await nextTick()
  const dialog = resetDialog.value
  if (show && dialog && !dialog.open) dialog.showModal()
  else if (!show && dialog?.open) dialog.close()
})

watch(showDeleteConfirmation, async (show) => {
  await nextTick()
  const dialog = deleteDialog.value
  if (show && dialog && !dialog.open) dialog.showModal()
  else if (!show && dialog?.open) dialog.close()
  if (!show) {
    deletePassword.value = ''
    deletePhrase.value = ''
    deleteError.value = ''
  }
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
    link.download = `lelac-configuration-${new Date().toISOString().slice(0, 10)}.json`
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
        <NuxtLink :to="boardStore.accountHandle ? accountHomePath(boardStore.accountHandle) : '/'" class="settings-brand">Le Lac</NuxtLink>
        <NuxtLink :to="returnToBoard" class="settings-back"><span class="i-ph-arrow-left" aria-hidden="true" />Retour au tableau</NuxtLink>
      </header>

      <section class="settings-content" aria-labelledby="settings-page-title">
        <p class="settings-kicker">VOTRE ESPACE</p>
        <h1 id="settings-page-title">Paramètres</h1>
        <p class="settings-intro">Réglez l’apparence et retrouvez une disposition propre à tout moment.</p>

        <section class="settings-section" aria-labelledby="account-heading">
          <div class="section-heading">
            <h2 id="account-heading">Compte</h2>
            <p>Vos tableaux sont liés à cette adresse.</p>
          </div>
          <div class="setting-row">
            <div class="setting-copy">
              <h3>{{ authSession.user.value?.email }}</h3>
              <p>Adresse confirmée</p>
            </div>
            <button type="button" class="reset-button" @click="logout">Se déconnecter</button>
          </div>
          <form class="account-handle-setting" @submit.prevent="saveAccountHandle">
            <div class="setting-copy">
              <h3>Adresse de vos tableaux</h3>
              <p>Cette adresse identifie votre espace sans afficher votre e-mail. Vos tableaux restent privés et nécessitent une connexion.</p>
            </div>
            <div class="account-handle-controls">
              <span class="account-handle-prefix" aria-hidden="true">/@</span>
              <input v-model="handleDraft" autocomplete="username" maxlength="36" aria-label="Pseudo de votre compte" :aria-invalid="!!handleError" :disabled="!handleReady || savingHandle">
              <button type="submit" class="reset-button" :disabled="!handleReady || savingHandle">{{ !handleReady ? 'Chargement…' : savingHandle ? 'Enregistrement…' : 'Enregistrer' }}</button>
            </div>
            <p class="account-handle-preview">
              <template v-if="accountHomeUrl">Aperçu : <NuxtLink :to="accountHomeUrl">{{ accountHomeUrl }}</NuxtLink></template>
              <template v-else>Chargement de votre pseudo…</template>
            </p>
            <p v-if="handleError" class="settings-error" role="alert">{{ handleError }}</p>
            <p v-else-if="handleMessage" class="settings-success" role="status">{{ handleMessage }}</p>
          </form>
          <div class="setting-row account-danger-row">
            <div class="setting-copy">
              <h3>Supprimer le compte</h3>
              <p>Efface votre compte et les tableaux synchronisés qui lui appartiennent.</p>
            </div>
            <button type="button" class="danger-button" @click="showDeleteConfirmation = true">Supprimer mon compte</button>
          </div>
        </section>

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
            <p>Cette action restaure les trois tableaux de départ et retire les tableaux personnalisés.</p>
          </div>
          <div class="setting-row reset-row">
            <div class="setting-copy">
              <h3>Disposition initiale</h3>
              <p>Les noms, l’ordre et les widgets personnalisés seront remplacés par les réglages de départ.</p>
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
              <h3>Configuration Le Lac</h3>
              <p>Inclut le thème, les widgets, les noms et l’ordre de vos {{ boardStore.dashboards.length }} tableaux.</p>
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

        <footer class="settings-footer">Vos tableaux sont synchronisés avec votre compte. Une copie locale sert de récupération en cas d’indisponibilité.</footer>
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
    <dialog ref="deleteDialog" class="reset-confirmation delete-confirmation" aria-labelledby="delete-title" @cancel.prevent="showDeleteConfirmation = false" @click="($event.target === $event.currentTarget) && (showDeleteConfirmation = false)">
      <h2 id="delete-title">Supprimer définitivement votre compte ?</h2>
      <p>Cette action efface votre compte ainsi que les tableaux et liens de vérification associés. Elle ne peut pas être annulée.</p>
      <form class="delete-form" @submit.prevent="deleteAccount">
        <label>
          <span>Mot de passe actuel</span>
          <input v-model="deletePassword" type="password" autocomplete="current-password" minlength="12" maxlength="128" required>
        </label>
        <label>
          <span>Saisissez SUPPRIMER pour confirmer</span>
          <input v-model="deletePhrase" type="text" autocomplete="off" required>
        </label>
        <p v-if="deleteError" class="delete-error" role="alert">{{ deleteError }}</p>
        <footer>
          <button type="button" class="cancel-button" :disabled="deletingAccount" @click="showDeleteConfirmation = false">Annuler</button>
          <button type="submit" class="danger-confirm-button" :disabled="deletingAccount || deletePhrase !== 'SUPPRIMER'">{{ deletingAccount ? 'Suppression…' : 'Supprimer le compte' }}</button>
        </footer>
      </form>
    </dialog>
    <dialog ref="importDialog" class="reset-confirmation" aria-labelledby="import-title" @cancel.prevent="showImportConfirmation = false" @click="($event.target === $event.currentTarget) && (showImportConfirmation = false)">
      <h2 id="import-title">Importer cette configuration ?</h2>
      <p>Le thème et les {{ pendingImport?.dashboards.length ?? 0 }} tableaux de cette application seront remplacés par le contenu du fichier.</p>
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
.account-danger-row { margin-top: 12px; }
.setting-copy { min-width: 0; }
.setting-copy h3 { margin: 0; color: var(--board-text); font-size: 14px; font-weight: 550; }
.setting-copy p { margin: 5px 0 0; color: var(--board-text-muted); font-size: 12px; line-height: 1.5; }
.account-handle-setting { display: grid; gap: 12px; padding: 18px 20px; border-radius: 10px; background: var(--board-surface); }
.account-handle-controls { display: flex; min-width: 0; align-items: center; gap: 8px; }
.account-handle-prefix { color: var(--board-text-muted); font: 14px/1 'SF Mono', 'Cascadia Code', monospace; }
.account-handle-controls input { box-sizing: border-box; width: min(100%, 360px); min-width: 0; height: 40px; padding: 0 11px; border: 1px solid var(--board-border-strong); border-radius: 6px; outline: none; background: var(--board-surface-alt); color: var(--board-text); font: 13px/1.4 system-ui, sans-serif; }
.account-handle-controls input:focus-visible { border-color: var(--board-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--board-accent) 24%, transparent); }
.account-handle-controls .reset-button { flex: 0 0 auto; }
.account-handle-controls .reset-button:disabled { opacity: .55; cursor: wait; }
.account-handle-preview { margin: 0; color: var(--board-text-muted); font-size: 11px; line-height: 1.5; overflow-wrap: anywhere; }
.account-handle-preview a { color: var(--board-accent); text-decoration: none; }
.account-handle-preview a:hover { text-decoration: underline; }
.settings-success { margin: 0; color: #4c8063; font-size: 12px; }
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
.danger-button, .danger-confirm-button { display: inline-flex; min-height: 40px; align-items: center; justify-content: center; padding: 0 14px; border: 1px solid color-mix(in srgb, #d46e67 55%, var(--board-border)); border-radius: 6px; background: color-mix(in srgb, #d46e67 12%, var(--board-surface)); color: #e89a93; font: 12px/1 system-ui, sans-serif; cursor: pointer; }
.danger-button:hover { background: color-mix(in srgb, #d46e67 20%, var(--board-surface)); }
.danger-confirm-button { border-color: #b84640; background: #b84640; color: white; }
.danger-confirm-button:disabled, .cancel-button:disabled { cursor: wait; opacity: .65; }
.delete-form { display: grid; gap: 16px; margin-top: 18px; }
.delete-form label { display: grid; gap: 7px; color: var(--board-text-soft); font-size: 12px; }
.delete-form input { width: 100%; min-height: 40px; padding: 0 11px; border: 1px solid var(--board-border-strong); border-radius: 6px; outline: none; background: var(--board-surface-alt); color: var(--board-text); font: 13px/1.4 system-ui, sans-serif; }
.delete-form input:focus-visible { border-color: var(--board-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--board-accent) 24%, transparent); }
.delete-error { margin: 0; color: #df8f87; font-size: 12px; }
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
  .account-danger-row button { width: 100%; }
  .account-handle-setting { padding: 16px; }
  .account-handle-controls { align-items: stretch; flex-wrap: wrap; }
  .account-handle-controls input { flex: 1 1 140px; }
  .account-handle-controls .reset-button { flex: 1 1 100%; }
}
</style>
