import { dashboardIds, parseBoard, type BoardConfig, type DashboardId } from '~/utils/boardConfig'
import { saveDashboardRows } from '../utils/dashboardStorage'

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

  const db = getAuthEnv(event).DB
  await saveDashboardRows(db, user.id, entries)
  return { ok: true }
})
