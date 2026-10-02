const publicPaths = new Set(['/login', '/register', '/forgot-password', '/reset-password'])

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const session = useUserSession()
  if (!session.ready.value) await session.fetch()

  if (publicPaths.has(to.path)) {
    if (session.loggedIn.value && to.path !== '/reset-password') return navigateTo('/')
    return
  }

  if (!session.loggedIn.value) return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
})
