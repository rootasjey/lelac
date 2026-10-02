import { dashboardIds, parseBoard, type BoardConfig, type DashboardId } from '~/utils/boardConfig'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (!user?.id) throw createError({ statusCode: 401, statusMessage: 'Session invalide.' })
  const body = await readBody<{ dashboards?: unknown }>(event)
  if (!body?.dashboards || typeof body.dashboards !== 'object' || Array.isArray(body.dashboards)) {
    throw createError({ statusCode: 400, statusMessage: 'La configuration des tableaux est invalide.' })
  }

  const entries: Array<{ id: DashboardId; config: BoardConfig }> = []
  for (const id of dashboardIds) {
    const parsed = parseBoard((body.dashboards as Record<string, unknown>)[id])
    if (!parsed) throw createError({ statusCode: 400, statusMessage: `Configuration invalide pour le tableau ${id}.` })
    entries.push({ id, config: parsed })
  }

  const now = new Date().toISOString()
  const db = getAuthEnv(event).DB
  await db.batch(entries.map(({ id, config }) => db.prepare(`
    INSERT INTO dashboards (user_id, dashboard_id, config_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, dashboard_id) DO UPDATE SET config_json = excluded.config_json, updated_at = excluded.updated_at
  `).bind(user.id, id, JSON.stringify(config), now)))
  return { ok: true }
})
