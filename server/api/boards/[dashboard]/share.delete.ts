import { isValidDashboardId } from '~/utils/boardConfig'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (!user?.id) throw createError({ statusCode: 401, statusMessage: 'Session invalide.' })
  const dashboardId = getRouterParam(event, 'dashboard')
  if (!isValidDashboardId(dashboardId)) throw createError({ statusCode: 404, statusMessage: 'Tableau inconnu.' })

  await getAuthEnv(event).DB.prepare('DELETE FROM dashboard_shares WHERE user_id = ? AND dashboard_id = ?')
    .bind(user.id, dashboardId).run()
  return { enabled: false }
})
