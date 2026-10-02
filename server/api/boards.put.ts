import { parseBoard, parseDashboardDefinitions, type DashboardBackup } from '~/utils/boardConfig'
import { saveDashboardCollection } from '../utils/dashboardStorage'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (!user?.id) throw createError({ statusCode: 401, statusMessage: 'Session invalide.' })
  const body = await readBody<{ dashboards?: unknown }>(event)
  if (!Array.isArray(body?.dashboards)) {
    throw createError({ statusCode: 400, statusMessage: 'La configuration des tableaux est invalide.' })
  }

  const definitions = parseDashboardDefinitions(body.dashboards.map((dashboard: unknown) => {
    if (!dashboard || typeof dashboard !== 'object' || Array.isArray(dashboard)) return dashboard
    const item = dashboard as Record<string, unknown>
    return { id: item.id, title: item.title, order: item.order }
  }))
  if (!definitions) throw createError({ statusCode: 400, statusMessage: 'La liste des tableaux est invalide.' })

  const entries: DashboardBackup[] = []
  for (const definition of definitions) {
    const item = body.dashboards.find((dashboard: unknown) => dashboard && typeof dashboard === 'object' && (dashboard as Record<string, unknown>).id === definition.id) as Record<string, unknown> | undefined
    const config = parseBoard(item?.config)
    if (!config) throw createError({ statusCode: 400, statusMessage: `Configuration invalide pour le tableau ${definition.id}.` })
    entries.push({ ...definition, config })
  }

  await saveDashboardCollection(getAuthEnv(event).DB, user.id, entries.map(({ id, title, order, config }) => ({ id, title, position: order, config })))
  return { ok: true }
})
