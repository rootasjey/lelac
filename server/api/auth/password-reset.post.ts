import { assertAuthEmailReady, buildAuthLink, enforceAuthRateLimit, getAuthEnv, issueAuthToken, normalizeEmail, sendAuthEmail } from '../../utils/auth'

const resetLifetime = 60 * 60 * 1000

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: unknown }>(event)
  const email = normalizeEmail(body?.email)
  if (!email) throw createError({ statusCode: 400, statusMessage: 'Saisissez une adresse e-mail valide.' })

  await enforceAuthRateLimit(event, 'reset-ip', 'all', 8, 60 * 60 * 1000)
  await enforceAuthRateLimit(event, 'reset-email', email, 3, 60 * 60 * 1000)
  assertAuthEmailReady(event, '/reset-password')

  const user = await getAuthEnv(event).DB.prepare('SELECT id, email_verified_at FROM users WHERE email = ?').bind(email).first<{ id: string; email_verified_at: string | null }>()
  if (user?.email_verified_at) {
    const token = await issueAuthToken(event, user.id, 'reset-password', resetLifetime)
    const url = buildAuthLink(event, '/reset-password', token)
    await sendAuthEmail(event, { to: email, subject: 'Réinitialisez votre mot de passe · Le Lac', url, action: 'choisir un nouveau mot de passe' })
  }
  return { ok: true, message: 'Si un compte vérifié correspond à cette adresse, un lien de réinitialisation va être envoyé.' }
})
