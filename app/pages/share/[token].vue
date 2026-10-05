<script setup lang="ts">
import type { BoardConfig, DashboardId } from '~/utils/boardConfig'

const route = useRoute()
const token = computed(() => typeof route.params.token === 'string' ? route.params.token : '')
const sharedDashboard = shallowRef<{ dashboardId: DashboardId; title: string; config: BoardConfig } | null>(null)
const failed = ref(false)
const loading = ref(true)
const unlockRequired = ref(false)
const password = ref('')
const unlocking = ref(false)
const unlockError = ref('')
const passwordInput = ref<HTMLInputElement | null>(null)
const passwordValid = computed(() => {
  const length = new TextEncoder().encode(password.value).byteLength
  return length >= 12 && length <= 128
})

function statusCodeOf(error: unknown) {
  if (!error || typeof error !== 'object') return 0
  const value = error as { statusCode?: number; status?: number; response?: { status?: number } }
  return value.statusCode ?? value.status ?? value.response?.status ?? 0
}

async function loadSharedDashboard() {
  sharedDashboard.value = await $fetch(`/api/public/boards/${encodeURIComponent(token.value)}`)
  unlockRequired.value = false
  failed.value = false
}

watch(unlockRequired, async (required) => {
  if (!required) return
  await nextTick()
  passwordInput.value?.focus()
})

useHead(() => ({
  title: sharedDashboard.value ? `${sharedDashboard.value.title} — Tableau partagé — Le Lac` : 'Tableau partagé — Le Lac',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
    { name: 'referrer', content: 'no-referrer' },
  ],
}))

onMounted(async () => {
  try {
    await loadSharedDashboard()
  } catch (error) {
    if (statusCodeOf(error) === 401) unlockRequired.value = true
    else failed.value = true
  } finally {
    loading.value = false
  }
})

async function unlock() {
  unlocking.value = true
  unlockError.value = ''
  try {
    await $fetch(`/api/public/boards/${encodeURIComponent(token.value)}/unlock`, { method: 'POST', body: { password: password.value } })
    password.value = ''
    await loadSharedDashboard()
  } catch (error) {
    const status = statusCodeOf(error)
    if (status === 401) unlockError.value = 'Ce mot de passe ne correspond pas. Réessayez.'
    else if (status === 429) unlockError.value = 'Trop de tentatives. Réessayez dans quelques minutes.'
    else if (status === 404) {
      unlockRequired.value = false
      failed.value = true
    } else unlockError.value = 'Le tableau n’a pas pu être ouvert. Réessayez.'
  } finally {
    unlocking.value = false
  }
}
</script>

<template>
  <BoardDashboard v-if="sharedDashboard" :dashboard-id="sharedDashboard.dashboardId" :shared-dashboard="sharedDashboard" />
  <main v-else-if="unlockRequired && !loading" class="shared-status">
    <p class="shared-brand">Le Lac</p>
    <form class="share-unlock" @submit.prevent="unlock">
      <h1>Tableau protégé</h1>
      <p>Saisissez le mot de passe fourni avec ce lien.</p>
      <label for="share-password">Mot de passe</label>
      <input id="share-password" ref="passwordInput" v-model="password" type="password" autocomplete="current-password" required>
      <p class="share-password-hint">12 à 128 octets UTF-8.</p>
      <p v-if="unlockError" class="share-unlock-error" role="alert">{{ unlockError }}</p>
      <button type="submit" :disabled="unlocking || !passwordValid">{{ unlocking ? 'Vérification…' : 'Ouvrir le tableau' }}</button>
    </form>
  </main>
  <main v-else class="shared-status" role="status">
    <p class="shared-brand">Le Lac</p>
    <h1>{{ loading ? 'Ouverture du tableau…' : failed ? 'Ce lien n’est plus disponible.' : 'Tableau partagé' }}</h1>
    <p v-if="failed">Le propriétaire a peut-être désactivé le partage ou supprimé ce tableau.</p>
    <NuxtLink v-if="failed" to="/register">Créer mon espace</NuxtLink>
  </main>
</template>

<style scoped>
.shared-status { box-sizing: border-box; display: grid; min-height: 100dvh; place-content: center; gap: 12px; padding: 24px; background: var(--board-page, #141418); color: var(--board-text, #e3e0e7); font: 14px/1.5 system-ui, sans-serif; text-align: center; }
.shared-status p, .shared-status h1 { margin: 0; }
.shared-brand { color: var(--board-accent, #d8bd72); font: 16px/1.2 'SF Mono', 'Cascadia Code', monospace; }
.shared-status h1 { font-size: 22px; }
.shared-status a { margin-top: 8px; color: var(--board-accent, #d8bd72); }
.share-unlock { box-sizing: border-box; display: grid; width: min(420px, calc(100vw - 40px)); gap: 14px; margin-top: 20px; padding: 28px; border: 1px solid var(--board-border-strong, #39363f); border-radius: 12px; background: var(--board-surface-dialog, #1a191f); text-align: left; }
.share-unlock h1 { margin: 0; font: 24px/1.2 system-ui, sans-serif; }
.share-unlock > p { color: var(--board-text-muted, #aaa6b2); }
.share-unlock label { margin-top: 8px; color: var(--board-text-soft, #c9c5ce); font: 13px/1.4 system-ui, sans-serif; }
.share-password-hint { color: var(--board-text-muted, #aaa6b2); font-size: 12px; }
.share-unlock input { box-sizing: border-box; width: 100%; height: 44px; padding: 0 12px; border: 1px solid var(--board-border-control, #514d58); border-radius: 6px; background: var(--board-surface-alt, #242229); color: var(--board-text, #e3e0e7); font: 15px/1.3 system-ui, sans-serif; }
.share-unlock input:focus-visible { outline: 2px solid var(--board-accent, #d8bd72); outline-offset: 2px; }
.share-unlock button { min-height: 44px; border: 0; border-radius: 6px; background: var(--board-accent, #d8bd72); color: var(--board-canvas, #141418); font: 600 14px/1 system-ui, sans-serif; cursor: pointer; }
.share-unlock button:disabled { opacity: .55; cursor: wait; }
.share-unlock-error { color: #e89a93 !important; font-size: 13px; }
</style>
