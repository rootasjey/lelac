import { dashboardIds, defaultDashboard, parseBoard, type BoardConfig, type DashboardId } from '~/utils/boardConfig'
import { loadDashboardRows } from '../utils/dashboardStorage'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (!user?.id) throw createError({ statusCode: 401, statusMessage: 'Session invalide.' })
  const db = getAuthEnv(event).DB
  const rows = await loadDashboardRows(db, user.id)
  const stored = new Map<DashboardId, BoardConfig>()
  for (const row of rows.results ?? []) {
    if (!dashboardIds.includes(row.dashboard_id as DashboardId)) continue
    try {
      const parsed = parseBoard(JSON.parse(row.config_json))
      if (parsed) stored.set(row.dashboard_id as DashboardId, parsed)
    } catch { /* An invalid row is replaced by its safe default and repaired on the next save. */ }
  }
  const dashboards = Object.fromEntries(dashboardIds.map(id => [id, stored.get(id) ?? defaultDashboard(id)])) as Record<DashboardId, BoardConfig>
  return { dashboards, hasStoredDashboards: stored.size > 0 }
})
