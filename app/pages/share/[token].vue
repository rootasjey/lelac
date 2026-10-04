<script setup lang="ts">
import type { BoardConfig, DashboardId } from '~/utils/boardConfig'

const route = useRoute()
const token = computed(() => typeof route.params.token === 'string' ? route.params.token : '')
const sharedDashboard = shallowRef<{ dashboardId: DashboardId; title: string; config: BoardConfig } | null>(null)
const failed = ref(false)
const loading = ref(true)

useHead(() => ({
  title: sharedDashboard.value ? `${sharedDashboard.value.title} — Tableau partagé — Le Lac` : 'Tableau partagé — Le Lac',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
    { name: 'referrer', content: 'no-referrer' },
  ],
}))

onMounted(async () => {
  try {
    sharedDashboard.value = await $fetch(`/api/public/boards/${encodeURIComponent(token.value)}`)
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <BoardDashboard v-if="sharedDashboard" :dashboard-id="sharedDashboard.dashboardId" :shared-dashboard="sharedDashboard" />
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
</style>
