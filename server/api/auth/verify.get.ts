import { getAuthEnv, hashToken } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const { token } = getQuery(event)
  if (typeof token !== 'string' || token.length < 32 || token.length > 128) {
    return sendRedirect(event, '/login?verification=invalid', 303)
  }

  const db = getAuthEnv(event).DB
  const now = new Date().toISOString()
  const tokenHash = await hashToken(token)
  const result = await db.prepare(`
    UPDATE auth_tokens SET consumed_at = ?
    WHERE token_hash = ? AND purpose = 'verify-email' AND consumed_at IS NULL AND expires_at > ?
    RETURNING user_id
  `).bind(now, tokenHash, now).first<{ user_id: string }>()
  if (!result) return sendRedirect(event, '/login?verification=invalid', 303)

  const user = await db.prepare('UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?), updated_at = ? WHERE id = ? RETURNING id, email')
    .bind(now, now, result.user_id).first<{ id: string; email: string }>()
  if (!user) return sendRedirect(event, '/login?verification=invalid', 303)
  await setUserSession(event, { user: { id: user.id, email: user.email, emailVerified: true } })
  return sendRedirect(event, '/?verified=1', 303)
})
