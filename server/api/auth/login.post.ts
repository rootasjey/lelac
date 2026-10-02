import { enforceAuthRateLimit, getAuthEnv, normalizeEmail, type AuthUserRow } from '../../utils/auth'

const dummyPasswordHash = hashPassword('trame-invalid-login-sentinel')

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: unknown; password?: unknown }>(event)
  const email = normalizeEmail(body?.email)
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email || !password || password.length > 128) {
    throw createError({ statusCode: 400, statusMessage: 'Adresse e-mail ou mot de passe incorrect.' })
  }

  await enforceAuthRateLimit(event, 'login-ip', 'all', 20, 15 * 60 * 1000)
  await enforceAuthRateLimit(event, 'login-email', email, 8, 15 * 60 * 1000)

  const user = await getAuthEnv(event).DB.prepare('SELECT id, email, password_hash, email_verified_at FROM users WHERE email = ?').bind(email).first<AuthUserRow>()
  const passwordMatches = await verifyPassword(user?.password_hash ?? await dummyPasswordHash, password)
  if (!user || !passwordMatches) throw createError({ statusCode: 401, statusMessage: 'Adresse e-mail ou mot de passe incorrect.' })
  if (!user.email_verified_at) throw createError({ statusCode: 403, statusMessage: 'Confirmez votre adresse e-mail avant de vous connecter.' })

  await setUserSession(event, { user: { id: user.id, email: user.email, emailVerified: true } })
  return { ok: true }
})
