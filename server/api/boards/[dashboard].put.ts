import { dashboardIds, parseBoard, type DashboardId } from '~/utils/boardConfig'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (!user?.id) throw createError({ statusCode: 401, statusMessage: 'Session invalide.' })
  const dashboardId = getRouterParam(event, 'dashboard') as DashboardId | undefined
  if (!dashboardId || !dashboardIds.includes(dashboardId)) throw createError({ statusCode: 404, statusMessage: 'Tableau inconnu.' })

  const parsed = parseBoard(await readBody(event))
  if (!parsed) throw createError({ statusCode: 400, statusMessage: 'La configuration du tableau est invalide.' })
  await getAuthEnv(event).DB.prepare(`
    INSERT INTO dashboards (user_id, dashboard_id, config_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, dashboard_id) DO UPDATE SET config_json = excluded.config_json, updated_at = excluded.updated_at
  `).bind(user.id, dashboardId, JSON.stringify(parsed), new Date().toISOString()).run()
  return { ok: true }
})
