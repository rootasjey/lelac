import { isValidDashboardId } from '~/utils/boardConfig'
import { hashToken, randomToken } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (!user?.id) throw createError({ statusCode: 401, statusMessage: 'Session invalide.' })
  const dashboardId = getRouterParam(event, 'dashboard')
  if (!isValidDashboardId(dashboardId)) throw createError({ statusCode: 404, statusMessage: 'Tableau inconnu.' })

  const db = getAuthEnv(event).DB
  const definition = await db.prepare('SELECT 1 FROM dashboard_definitions WHERE user_id = ? AND dashboard_id = ?')
    .bind(user.id, dashboardId).first()
  if (!definition) throw createError({ statusCode: 404, statusMessage: 'Tableau inconnu.' })

  // A new link always rotates the previous token. Only its hash is retained.
  const token = randomToken()
  await db.prepare(`INSERT INTO dashboard_shares (user_id, dashboard_id, token_hash)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, dashboard_id) DO UPDATE SET token_hash = excluded.token_hash, created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
    .bind(user.id, dashboardId, await hashToken(token)).run()

  return { enabled: true, path: `/share/${token}` }
})
