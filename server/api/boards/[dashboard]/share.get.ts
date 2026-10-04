import { dashboardIds, isValidDashboardId } from '~/utils/boardConfig'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (!user?.id) throw createError({ statusCode: 401, statusMessage: 'Session invalide.' })
  const dashboardId = getRouterParam(event, 'dashboard')
  if (!isValidDashboardId(dashboardId)) throw createError({ statusCode: 404, statusMessage: 'Tableau inconnu.' })

  const definition = await getAuthEnv(event).DB.prepare('SELECT 1 FROM dashboard_definitions WHERE user_id = ? AND dashboard_id = ?')
    .bind(user.id, dashboardId).first()
  if (!definition) throw createError({ statusCode: 404, statusMessage: 'Tableau inconnu.' })

  const share = await getAuthEnv(event).DB.prepare('SELECT expires_at FROM dashboard_shares WHERE user_id = ? AND dashboard_id = ?')
    .bind(user.id, dashboardId).first<{ expires_at: string | null }>()
  return { enabled: Boolean(share), expiresAt: share?.expires_at ?? null }
})
