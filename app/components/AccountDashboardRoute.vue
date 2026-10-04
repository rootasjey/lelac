<script setup lang="ts">
import { accountDashboardPath } from '~~/shared/utils/accountHandle'

const props = defineProps<{ dashboard?: string }>()
const route = useRoute()
const boardStore = useBoardStore()
const ready = ref(false)
const failed = ref(false)
const resolvedDashboard = ref('')
const requestedHandle = computed(() => {
  const value = route.params.account
  return typeof value === 'string' ? value.replace(/^@/, '') : ''
})

function cachedDashboardId() {
  if (boardStore.accountHandle !== requestedHandle.value) return ''
  const requestedDashboard = props.dashboard || boardStore.dashboards[0]?.id
  return boardStore.dashboards.some(item => item.id === requestedDashboard) ? requestedDashboard ?? '' : ''
}

if (import.meta.client) {
  const cachedId = cachedDashboardId()
  if (cachedId) {
    resolvedDashboard.value = cachedId
    ready.value = true
  }
}

let resolutionId = 0
async function resolveDashboardRoute() {
  const currentResolution = ++resolutionId
  const cachedId = cachedDashboardId()
  if (cachedId) {
    resolvedDashboard.value = cachedId
    failed.value = false
    ready.value = true
    return
  }

  ready.value = false
  failed.value = false
  try {
    const result = await $fetch<{ handle: string; dashboardId: string; redirect: string }>('/api/account/route', {
      query: { handle: requestedHandle.value, dashboard: props.dashboard },
    })
    if (currentResolution !== resolutionId) return
    if (result.redirect) {
      await navigateTo(result.redirect, { replace: true })
      return
    }
    resolvedDashboard.value = result.dashboardId
    ready.value = true
  } catch {
    if (currentResolution !== resolutionId) return
    failed.value = true
  }
}

watch([requestedHandle, () => props.dashboard], () => {
  if (import.meta.client) void resolveDashboardRoute()
})

onMounted(() => {
  if (!cachedDashboardId()) void resolveDashboardRoute()
})
</script>

<template>
  <ClientOnly>
    <BoardDashboard v-if="ready" :dashboard-id="resolvedDashboard || dashboard || 'daily'" />
    <main v-else-if="failed" class="account-route-status"><h1>Ce tableau est introuvable.</h1><NuxtLink to="/">Retour à l’accueil</NuxtLink></main>
    <p v-else class="account-route-status" role="status">Ouverture de votre tableau…</p>
    <template #fallback><p class="account-route-status">Ouverture de votre tableau…</p></template>
  </ClientOnly>
</template>

<style scoped>
.account-route-status { box-sizing: border-box; display: grid; min-height: 100dvh; place-content: center; gap: 12px; margin: 0; padding: 24px; background: var(--board-page, #141418); color: var(--board-text, #e3e0e7); font: 14px/1.5 system-ui, sans-serif; text-align: center; }
.account-route-status h1 { margin: 0; font-size: 20px; }
.account-route-status a { color: var(--board-accent, #d8bd72); }
</style>
