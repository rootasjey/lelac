import { getAuthEnv, resetPasswordWithToken, validatePassword } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ token?: unknown; password?: unknown }>(event)
  if (typeof body?.token !== 'string' || body.token.length < 32 || body.token.length > 128 || !validatePassword(body.password)) {
    throw createError({ statusCode: 400, statusMessage: 'Le lien est invalide ou le mot de passe ne respecte pas les exigences.' })
  }

  const db = getAuthEnv(event).DB
  const now = new Date().toISOString()
  const passwordHash = await hashPassword(body.password)
  // Claim the token with one conditional write so concurrent submissions cannot both use it.
  const token = await resetPasswordWithToken(db, body.token, passwordHash, now)
  if (!token) throw createError({ statusCode: 400, statusMessage: 'Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.' })
  await clearUserSession(event)
  return { ok: true, message: 'Votre mot de passe a été modifié. Vous pouvez vous connecter.' }
})
