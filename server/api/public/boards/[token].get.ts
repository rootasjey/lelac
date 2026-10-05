import { defaultDashboard, isValidDashboardId, parseBoard } from '~/utils/boardConfig'
import { hashToken } from '../../../utils/auth'
import { shareAccessCookieName } from '../../../utils/sharePassword'
import { getCookie } from 'h3'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store, private')
  setResponseHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
  setResponseHeader(event, 'Referrer-Policy', 'no-referrer')
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')

  const token = getRouterParam(event, 'token')
  if (!token || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
    throw createError({ statusCode: 404, statusMessage: 'Ce tableau partagé est introuvable ou son lien a été désactivé.' })
  }

  const row = await getAuthEnv(event).DB.prepare(`SELECT d.dashboard_id, d.title, b.config_json,
      s.user_id AS share_user_id, s.password_hash, s.password_salt, s.expires_at
    FROM dashboard_shares s
    JOIN dashboard_definitions d ON d.user_id = s.user_id AND d.dashboard_id = s.dashboard_id
    LEFT JOIN dashboards b ON b.user_id = d.user_id AND b.dashboard_id = d.dashboard_id
    WHERE s.token_hash = ? AND (s.expires_at IS NULL OR s.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) LIMIT 1`)
    .bind(await hashToken(token)).first<{
      dashboard_id: string
      title: string
      config_json: string | null
      share_user_id: string
      password_hash: string | null
      password_salt: string | null
      expires_at: string | null
    }>()

  if (!row || !isValidDashboardId(row.dashboard_id)) {
    throw createError({ statusCode: 404, statusMessage: 'Ce tableau partagé est introuvable ou son lien a été désactivé.' })
  }

  if (row.password_hash) {
    const accessToken = getCookie(event, shareAccessCookieName())
    const accessTokenHash = accessToken ? await hashToken(accessToken) : ''
    const access = accessTokenHash
      ? await getAuthEnv(event).DB.prepare(`SELECT 1 FROM dashboard_share_access_sessions
          WHERE user_id = ? AND dashboard_id = ? AND token_hash = ? AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
        .bind(row.share_user_id, row.dashboard_id, accessTokenHash).first()
      : null
    if (!access) throw createError({ statusCode: 401, statusMessage: 'Ce tableau est protégé par un mot de passe.' })
  }

  let config = defaultDashboard(row.dashboard_id)
  if (row.config_json) {
    try {
      const parsed = parseBoard(JSON.parse(row.config_json))
      if (!parsed) throw new Error('Invalid saved dashboard')
      config = parsed
    } catch {
      throw createError({ statusCode: 404, statusMessage: 'Ce tableau partagé est indisponible.' })
    }
  }

  return { dashboardId: row.dashboard_id, title: row.title, config }
})
