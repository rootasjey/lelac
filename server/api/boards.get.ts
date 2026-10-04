import { defaultDashboard, defaultDashboardDefinitions, parseBoard, type DashboardBackup } from '~/utils/boardConfig'
import { loadDashboardDefinitions, loadDashboardRows } from '../utils/dashboardStorage'
import type { StoredDashboardDefinitionRow, StoredDashboardRow } from '../utils/dashboardStorage'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (!user?.id) throw createError({ statusCode: 401, statusMessage: 'Session invalide.' })
  const db = getAuthEnv(event).DB
  const [dashboardRows, definitionRows, account] = await Promise.all([
    loadDashboardRows(db, user.id),
    loadDashboardDefinitions(db, user.id),
    db.prepare('SELECT handle FROM users WHERE id = ?').bind(user.id).first<{ handle: string }>(),
  ])
  const storedRows = (dashboardRows.results ?? []) as StoredDashboardRow[]
  const savedDefinitions = (definitionRows.results ?? []) as StoredDashboardDefinitionRow[]
  const stored = new Map(storedRows.map(row => [row.dashboard_id, row.config_json]))
  const definitions = (savedDefinitions.length
    ? savedDefinitions.map(row => ({ id: row.dashboard_id, title: row.title, order: row.position }))
    : defaultDashboardDefinitions)
  const dashboards: DashboardBackup[] = definitions.map((definition, order) => {
    let config = defaultDashboard(definition.id)
    const raw = stored.get(definition.id)
    if (raw) {
      try { config = parseBoard(JSON.parse(raw)) ?? config }
      catch { /* Invalid saved data falls back to the safe board default. */ }
    }
    return { ...definition, order, config }
  })
  return { dashboards, hasStoredDashboards: storedRows.length > 0, accountHandle: account?.handle ?? '' }
})
