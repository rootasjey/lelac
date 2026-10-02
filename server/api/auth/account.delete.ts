import { enforceAuthRateLimit, getAuthEnv, validatePassword, type AuthUserRow } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (!user?.id || typeof user.email !== 'string') {
    throw createError({ statusCode: 401, statusMessage: 'Session invalide.' })
  }

  const body = await readBody<{ password?: unknown; confirmation?: unknown }>(event)
  if (!validatePassword(body?.password) || body?.confirmation !== 'SUPPRIMER') {
    throw createError({ statusCode: 400, statusMessage: 'Confirmez la suppression et saisissez votre mot de passe.' })
  }

  await enforceAuthRateLimit(event, 'delete-account-ip', 'all', 5, 60 * 60 * 1000)
  await enforceAuthRateLimit(event, 'delete-account-email', user.email, 3, 60 * 60 * 1000)

  const db = getAuthEnv(event).DB
  const account = await db.prepare('SELECT id, email, password_hash, email_verified_at FROM users WHERE id = ?')
    .bind(user.id).first<AuthUserRow>()
  const passwordMatches = await verifyPassword(account?.password_hash ?? await hashPassword('lelac-invalid-delete-sentinel'), body.password)
  if (!account || !passwordMatches) {
    throw createError({ statusCode: 403, statusMessage: 'Mot de passe incorrect.' })
  }

  const deleted = await db.prepare('DELETE FROM users WHERE id = ? RETURNING id').bind(user.id).first<{ id: string }>()
  if (!deleted) throw createError({ statusCode: 409, statusMessage: 'Le compte n’a pas pu être supprimé. Réessayez.' })

  await clearUserSession(event)
  return { ok: true }
})
