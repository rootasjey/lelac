import { assertAuthEmailReady, buildAuthLink, enforceAuthRateLimit, getAuthEnv, issueAuthToken, normalizeEmail, sendAuthEmail, validatePassword } from '../../utils/auth'

const verificationLifetime = 24 * 60 * 60 * 1000
const genericRegistrationMessage = 'Si cette adresse peut recevoir un lien de vérification, un e-mail va être envoyé.'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: unknown; password?: unknown }>(event)
  const email = normalizeEmail(body?.email)
  if (!email || !validatePassword(body?.password)) {
    throw createError({ statusCode: 400, statusMessage: 'Saisissez une adresse e-mail valide et un mot de passe de 12 à 128 caractères.' })
  }

  await enforceAuthRateLimit(event, 'register-ip', 'all', 8, 60 * 60 * 1000)
  await enforceAuthRateLimit(event, 'register-email', email, 3, 60 * 60 * 1000)
  assertAuthEmailReady(event, '/api/auth/verify')

  const db = getAuthEnv(event).DB
  const existing = await db.prepare('SELECT id, email_verified_at FROM users WHERE email = ?').bind(email).first<{ id: string; email_verified_at: string | null }>()
  if (existing?.email_verified_at) return { ok: true, message: genericRegistrationMessage }

  const userId = existing?.id ?? crypto.randomUUID()
  if (!existing) {
    const passwordHash = await hashPassword(body.password)
    try {
      await db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').bind(userId, email, passwordHash).run()
    } catch {
      // Do not reveal whether another request registered this address concurrently.
      return { ok: true, message: genericRegistrationMessage }
    }
  }

  const token = await issueAuthToken(event, userId, 'verify-email', verificationLifetime)
  const url = buildAuthLink(event, '/api/auth/verify', token)
  await sendAuthEmail(event, { to: email, subject: 'Confirmez votre adresse e-mail · Le Lac', url, action: 'confirmer votre adresse e-mail' })
  return { ok: true, message: genericRegistrationMessage }
})
