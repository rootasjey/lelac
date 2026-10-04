import { defaultDashboardDefinitions, isValidDashboardId } from '~/utils/boardConfig'
import { accountDashboardPath, normalizeAccountHandle } from '~~/shared/utils/accountHandle'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (!user?.id) throw createError({ statusCode: 401, statusMessage: 'Session invalide.' })

  const query = getQuery(event)
  const requestedHandle = typeof query.handle === 'string' ? normalizeAccountHandle(query.handle.replace(/^@/, '')) : null
  const requestedDashboard = typeof query.dashboard === 'string' ? query.dashboard : ''
  if (!requestedHandle || (requestedDashboard && !isValidDashboardId(requestedDashboard))) {
    throw createError({ statusCode: 404, statusMessage: 'Tableau introuvable.' })
  }

  const db = getAuthEnv(event).DB
  const [account, savedDefinitions] = await Promise.all([
    db.prepare('SELECT handle FROM users WHERE id = ?').bind(user.id).first<{ handle: string }>(),
    db.prepare('SELECT dashboard_id FROM dashboard_definitions WHERE user_id = ? ORDER BY position ASC')
      .bind(user.id).all<{ dashboard_id: string }>(),
  ])
  if (!account?.handle) throw createError({ statusCode: 404, statusMessage: 'Compte introuvable.' })

  const savedDashboardIds = (savedDefinitions.results ?? []).map((row: { dashboard_id: string }) => row.dashboard_id)
  const dashboardIds = savedDashboardIds.length
    ? savedDashboardIds
    : defaultDashboardDefinitions.map(item => item.id)
  const firstDashboard = dashboardIds[0] ?? 'daily'
  if (requestedDashboard && !dashboardIds.includes(requestedDashboard)) {
    throw createError({ statusCode: 404, statusMessage: 'Tableau introuvable.' })
  }
  const dashboardId = requestedDashboard || firstDashboard
  const redirect = requestedHandle === account.handle
    ? ''
    : accountDashboardPath(account.handle, dashboardId, firstDashboard)

  return { handle: account.handle, dashboardId, redirect }
})
