import { getAuthEnv, hashToken, validatePassword } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ token?: unknown; password?: unknown }>(event)
  if (typeof body?.token !== 'string' || body.token.length < 32 || body.token.length > 128 || !validatePassword(body.password)) {
    throw createError({ statusCode: 400, statusMessage: 'Le lien est invalide ou le mot de passe ne respecte pas les exigences.' })
  }

  const db = getAuthEnv(event).DB
  const now = new Date().toISOString()
  const tokenHash = await hashToken(body.token)
  const passwordHash = await hashPassword(body.password)
  // Claim the token with one conditional write so concurrent submissions cannot both use it.
  const token = await db.prepare(`
    UPDATE auth_tokens SET consumed_at = ?
    WHERE token_hash = ? AND purpose = 'reset-password' AND consumed_at IS NULL AND expires_at > ?
    RETURNING user_id
  `).bind(now, tokenHash, now).first<{ user_id: string }>()
  if (!token) throw createError({ statusCode: 400, statusMessage: 'Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.' })

  await db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(passwordHash, now, token.user_id).run()
  await clearUserSession(event)
  return { ok: true, message: 'Votre mot de passe a été modifié. Vous pouvez vous connecter.' }
})
