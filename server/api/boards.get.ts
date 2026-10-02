import { dashboardIds, defaultDashboard, parseBoard, type BoardConfig, type DashboardId } from '~/utils/boardConfig'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (!user?.id) throw createError({ statusCode: 401, statusMessage: 'Session invalide.' })
  const db = getAuthEnv(event).DB
  const rows = await db.prepare('SELECT dashboard_id, config_json FROM dashboards WHERE user_id = ?')
    .bind(user.id).all<{ dashboard_id: DashboardId; config_json: string }>()
  const stored = new Map<DashboardId, BoardConfig>()
  for (const row of rows.results ?? []) {
    if (!dashboardIds.includes(row.dashboard_id)) continue
    try {
      const parsed = parseBoard(JSON.parse(row.config_json))
      if (parsed) stored.set(row.dashboard_id, parsed)
    } catch { /* An invalid row is replaced by its safe default and repaired on the next save. */ }
  }
  const dashboards = Object.fromEntries(dashboardIds.map(id => [id, stored.get(id) ?? defaultDashboard(id)])) as Record<DashboardId, BoardConfig>
  return { dashboards, hasStoredDashboards: stored.size > 0 }
})
