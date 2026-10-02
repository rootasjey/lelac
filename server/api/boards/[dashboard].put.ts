import { dashboardIds, isValidDashboardId, parseBoard } from '~/utils/boardConfig'
import { saveDashboardRows } from '../../utils/dashboardStorage'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (!user?.id) throw createError({ statusCode: 401, statusMessage: 'Session invalide.' })
  const dashboardId = getRouterParam(event, 'dashboard')
  if (!isValidDashboardId(dashboardId)) throw createError({ statusCode: 404, statusMessage: 'Tableau inconnu.' })

  if (!dashboardIds.includes(dashboardId)) {
    const definition = await getAuthEnv(event).DB.prepare('SELECT 1 FROM dashboard_definitions WHERE user_id = ? AND dashboard_id = ?')
      .bind(user.id, dashboardId).first()
    if (!definition) throw createError({ statusCode: 404, statusMessage: 'Tableau inconnu.' })
  }

  const parsed = parseBoard(await readBody(event))
  if (!parsed) throw createError({ statusCode: 400, statusMessage: 'La configuration du tableau est invalide.' })
  await saveDashboardRows(getAuthEnv(event).DB, user.id, [{ id: dashboardId, config: parsed }])
  return { ok: true }
})
