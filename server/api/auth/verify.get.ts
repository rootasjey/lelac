import { getAuthEnv, verifyUserEmailWithToken } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const { token } = getQuery(event)
  if (typeof token !== 'string' || token.length < 32 || token.length > 128) {
    return sendRedirect(event, '/login?verification=invalid', 303)
  }

  const db = getAuthEnv(event).DB
  const now = new Date().toISOString()
  const user = await verifyUserEmailWithToken(db, token, now)
  if (!user) return sendRedirect(event, '/login?verification=invalid', 303)
  await setUserSession(event, { user: { id: user.id, email: user.email, emailVerified: true } })
  return sendRedirect(event, '/?verified=1', 303)
})
