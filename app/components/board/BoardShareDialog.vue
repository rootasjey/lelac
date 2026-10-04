<script setup lang="ts">
const props = defineProps<{ dashboardId: string; dashboardTitle: string }>()
const open = defineModel<boolean>('open', { default: false })
const enabled = ref(false)
const shareUrl = ref('')
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const message = ref('')

watch(open, async (isOpen) => {
  if (!isOpen) return
  shareUrl.value = ''
  error.value = ''
  message.value = ''
  loading.value = true
  try {
    const result = await $fetch<{ enabled: boolean }>(`/api/boards/${encodeURIComponent(props.dashboardId)}/share`)
    enabled.value = result.enabled
  } catch {
    error.value = 'Le partage de ce tableau n’a pas pu être chargé.'
  } finally {
    loading.value = false
  }
})

async function generateLink() {
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    const result = await $fetch<{ enabled: true; path: string }>(`/api/boards/${encodeURIComponent(props.dashboardId)}/share`, { method: 'POST' })
    enabled.value = true
    shareUrl.value = new URL(result.path, window.location.origin).toString()
    message.value = 'Le nouveau lien est prêt. Tout ancien lien de partage a été désactivé.'
  } catch {
    error.value = 'Le lien n’a pas pu être généré.'
  } finally {
    saving.value = false
  }
}

async function revokeLink() {
  saving.value = true
  error.value = ''
  message.value = ''
  try {
    await $fetch(`/api/boards/${encodeURIComponent(props.dashboardId)}/share`, { method: 'DELETE' })
    enabled.value = false
    shareUrl.value = ''
    message.value = 'Le lien public est désactivé.'
  } catch {
    error.value = 'Le lien n’a pas pu être désactivé.'
  } finally {
    saving.value = false
  }
}

async function copyLink() {
  if (!shareUrl.value) return
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    message.value = 'Lien copié dans le presse-papiers.'
  } catch {
    error.value = 'Copie impossible. Sélectionnez puis copiez le lien manuellement.'
  }
}
</script>

<template>
  <NDialog v-model:open="open">
    <NDialogContent class="board-share-dialog" :_dialog-overlay="{ class: 'board-share-overlay' }" :show-close="false">
      <header class="board-share-heading">
        <div>
          <NDialogTitle>Partager « {{ dashboardTitle }} »</NDialogTitle>
          <NDialogDescription>Toute personne qui possède le lien pourra consulter ce tableau et ses widgets. Vous pourrez désactiver le lien à tout moment.</NDialogDescription>
          <NDialogDescription>Les réglages des widgets sont également accessibles, notamment les URL de flux RSS. Évitez d’y inclure une URL ou une clé secrète.</NDialogDescription>
        </div>
        <NTooltip content="Fermer">
          <NButton type="button" icon label="i-ph-x-bold" btn="ghost" class="board-share-close" aria-label="Fermer le partage" @click="open = false" />
        </NTooltip>
      </header>

      <p v-if="loading" class="board-share-status" role="status">Vérification du partage…</p>
      <template v-else>
        <div v-if="enabled" class="board-share-enabled">
          <p class="board-share-state"><span class="i-ph-globe-hemisphere-west-bold" aria-hidden="true" /> Le partage est activé</p>
          <p v-if="!shareUrl" class="board-share-note">Pour protéger le lien, il n’est pas conservé en clair. Générez un nouveau lien pour le copier ; l’ancien sera alors révoqué.</p>
          <label v-if="shareUrl" class="board-share-link-label">
            <span>Lien public</span>
            <span class="board-share-link-control"><input :value="shareUrl" readonly aria-label="Lien public du tableau"><NButton type="button" btn="soft" :disabled="saving" @click="copyLink">Copier</NButton></span>
          </label>
        </div>
        <p v-else class="board-share-note">Le tableau est privé. Créez un lien public pour permettre sa consultation sans compte.</p>

        <p v-if="error" class="board-share-message is-error" role="alert">{{ error }}</p>
        <p v-else-if="message" class="board-share-message" role="status">{{ message }}</p>

        <footer class="board-share-actions">
          <NButton v-if="enabled" type="button" btn="soft" class="board-share-revoke" :disabled="saving" @click="revokeLink">Désactiver le lien</NButton>
          <NButton type="button" btn="solid" class="board-share-generate" :disabled="saving" @click="generateLink">{{ saving ? 'Patientez…' : enabled ? 'Générer un nouveau lien' : 'Créer un lien public' }}</NButton>
        </footer>
      </template>
    </NDialogContent>
  </NDialog>
</template>

<style scoped>
.board-share-dialog { width: min(560px, calc(100vw - 32px)); padding: 24px; border: 1px solid var(--board-border-strong); border-radius: 12px; background: var(--board-surface-dialog); color: var(--board-text); box-shadow: 0 24px 80px #0005; }
.board-share-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.board-share-heading :deep(h2) { margin: 0; font: 22px/1.25 system-ui, sans-serif; }
.board-share-heading :deep([data-slot='dialog-description']) { display: block; margin-top: 10px; color: var(--board-text-muted); font: 13px/1.55 system-ui, sans-serif; }
.board-share-close { flex: 0 0 40px; width: 40px; height: 40px; min-height: 40px; padding: 0; border: 0; border-radius: 999px; color: var(--board-text-muted); }
.board-share-close:hover { background: var(--board-hover-strong); color: var(--board-accent-bright); }
.board-share-status, .board-share-note { margin: 24px 0 0; color: var(--board-text-muted); font: 13px/1.55 system-ui, sans-serif; }
.board-share-state { display: flex; align-items: center; gap: 9px; margin: 24px 0 0; color: var(--board-accent-bright); font: 13px/1.4 system-ui, sans-serif; }
.board-share-state span { font-size: 17px; }
.board-share-link-label { display: grid; gap: 8px; margin-top: 18px; color: var(--board-text-soft); font: 12px/1.4 system-ui, sans-serif; }
.board-share-link-control { display: flex; gap: 8px; }
.board-share-link-control input { box-sizing: border-box; min-width: 0; flex: 1; height: 40px; padding: 0 10px; border: 1px solid var(--board-border-control); border-radius: 6px; background: var(--board-surface-alt); color: var(--board-text); font: 12px/1.3 'SF Mono', 'Cascadia Code', monospace; }
.board-share-message { margin: 14px 0 0; color: var(--board-text-muted); font: 12px/1.5 system-ui, sans-serif; }
.board-share-message.is-error { color: #e89a93; }
.board-share-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; margin-top: 26px; }
.board-share-revoke { color: #e89a93; }
.board-share-generate { background: var(--board-accent); color: var(--board-canvas); }
:global(.board-share-overlay[data-state='open']) { background: #08080cbb; }
@media (max-width: 520px) { .board-share-dialog { padding: 20px; } .board-share-actions { justify-content: stretch; } .board-share-actions :deep(button) { flex: 1 1 auto; } }
</style>
