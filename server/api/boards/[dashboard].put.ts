import { dashboardIds, parseBoard, type DashboardId } from '~/utils/boardConfig'
import { saveDashboardRows } from '../../utils/dashboardStorage'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (!user?.id) throw createError({ statusCode: 401, statusMessage: 'Session invalide.' })
  const dashboardId = getRouterParam(event, 'dashboard') as DashboardId | undefined
  if (!dashboardId || !dashboardIds.includes(dashboardId)) throw createError({ statusCode: 404, statusMessage: 'Tableau inconnu.' })

  const parsed = parseBoard(await readBody(event))
  if (!parsed) throw createError({ statusCode: 400, statusMessage: 'La configuration du tableau est invalide.' })
  await saveDashboardRows(getAuthEnv(event).DB, user.id, [{ id: dashboardId, config: parsed }])
  return { ok: true }
})
