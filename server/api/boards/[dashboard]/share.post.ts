import { isValidDashboardId } from '~/utils/boardConfig'
import { enforceAuthRateLimit, hashToken, randomToken } from '../../../utils/auth'
import { hashSharePassword, validateSharePassword } from '../../../utils/sharePassword'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (!user?.id) throw createError({ statusCode: 401, statusMessage: 'Session invalide.' })
  const dashboardId = getRouterParam(event, 'dashboard')
  if (!isValidDashboardId(dashboardId)) throw createError({ statusCode: 404, statusMessage: 'Tableau inconnu.' })

  const db = getAuthEnv(event).DB
  const definition = await db.prepare('SELECT 1 FROM dashboard_definitions WHERE user_id = ? AND dashboard_id = ?')
    .bind(user.id, dashboardId).first()
  if (!definition) throw createError({ statusCode: 404, statusMessage: 'Tableau inconnu.' })

  const body = await readBody<{ expirationDays?: number | null; protectWithPassword?: boolean; password?: unknown }>(event) ?? {}
  const expirationDays = body.expirationDays === undefined ? 30 : body.expirationDays
  if (expirationDays !== null && ![7, 30, 90].includes(expirationDays)) {
    throw createError({ statusCode: 400, statusMessage: 'Durée d’expiration invalide.' })
  }
  const protectWithPassword = body.protectWithPassword === true
  if (body.protectWithPassword !== undefined && typeof body.protectWithPassword !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'Option de protection invalide.' })
  }
  if (protectWithPassword && !validateSharePassword(body.password)) {
    throw createError({ statusCode: 400, statusMessage: 'Choisissez un mot de passe de 12 à 128 octets UTF-8.' })
  }
  if (!protectWithPassword && body.password !== undefined) {
    throw createError({ statusCode: 400, statusMessage: 'Le mot de passe doit être associé à la protection du partage.' })
  }
  const expiresAt = expirationDays === null
    ? null
    : new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()

  // A new link always rotates the previous token. Only its hash is retained.
  const token = randomToken()
  const password = protectWithPassword ? await hashSharePassword(body.password as string) : null
  await db.batch([
    db.prepare('DELETE FROM dashboard_share_access_sessions WHERE user_id = ? AND dashboard_id = ?')
      .bind(user.id, dashboardId),
    db.prepare(`INSERT INTO dashboard_shares (user_id, dashboard_id, token_hash, expires_at, password_salt, password_hash)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, dashboard_id) DO UPDATE SET token_hash = excluded.token_hash, expires_at = excluded.expires_at,
        password_salt = excluded.password_salt, password_hash = excluded.password_hash,
        created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
      .bind(user.id, dashboardId, await hashToken(token), expiresAt, password?.salt ?? null, password?.hash ?? null),
  ])

  return { enabled: true, path: `/share/${token}`, expiresAt, passwordProtected: protectWithPassword }
})
