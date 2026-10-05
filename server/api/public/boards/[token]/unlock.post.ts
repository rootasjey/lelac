import { getCookie, setCookie } from 'h3'
import { enforceAuthRateLimit, getAuthEnv, hashToken, randomToken } from '../../../../utils/auth'
import { hashSharePassword, shareAccessCookieName, shareAccessCookiePath, shareAccessExpiresAt, validateSharePassword, verifySharePassword } from '../../../../utils/sharePassword'

const unavailableMessage = 'Ce tableau partagé est introuvable ou son lien a été désactivé.'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store, private')
  setResponseHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
  setResponseHeader(event, 'Referrer-Policy', 'no-referrer')
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')

  const token = getRouterParam(event, 'token')
  if (!token || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
    throw createError({ statusCode: 404, statusMessage: unavailableMessage })
  }

  const body = await readBody<{ password?: unknown }>(event)
  if (!validateSharePassword(body?.password)) {
    throw createError({ statusCode: 400, statusMessage: 'Saisissez un mot de passe de 12 à 128 octets UTF-8.' })
  }

  const db = getAuthEnv(event).DB
  const shareTokenHash = await hashToken(token)
  await enforceAuthRateLimit(event, 'share-unlock', shareTokenHash, 10, 15 * 60 * 1000)

  const share = await db.prepare(`SELECT user_id, dashboard_id, password_salt, password_hash, expires_at
    FROM dashboard_shares
    WHERE token_hash = ? AND (expires_at IS NULL OR expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) LIMIT 1`)
    .bind(shareTokenHash).first<{
      user_id: string
      dashboard_id: string
      password_salt: string | null
      password_hash: string | null
      expires_at: string | null
    }>()

  if (!share || !share.password_hash || !share.password_salt) {
    throw createError({ statusCode: 404, statusMessage: unavailableMessage })
  }
  if (!await verifySharePassword(body.password, share.password_salt, share.password_hash)) {
    throw createError({ statusCode: 401, statusMessage: 'Mot de passe incorrect.' })
  }

  const accessToken = randomToken()
  const expiresAt = shareAccessExpiresAt(share.expires_at)
  const now = new Date().toISOString()
  const expiresInSeconds = Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)
  if (expiresInSeconds <= 0) throw createError({ statusCode: 404, statusMessage: unavailableMessage })

  await db.batch([
    db.prepare('DELETE FROM dashboard_share_access_sessions WHERE expires_at <= ?').bind(now),
    db.prepare('INSERT INTO dashboard_share_access_sessions (user_id, dashboard_id, token_hash, expires_at) VALUES (?, ?, ?, ?)')
      .bind(share.user_id, share.dashboard_id, await hashToken(accessToken), expiresAt),
  ])

  setCookie(event, shareAccessCookieName(), accessToken, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: shareAccessCookiePath(token),
    maxAge: expiresInSeconds,
  })
  return { unlocked: true }
})
