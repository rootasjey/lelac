import type { H3Event } from 'h3'

export type AuthTokenPurpose = 'verify-email' | 'reset-password'

export interface AuthUserRow {
  id: string
  email: string
  password_hash: string
  email_verified_at: string | null
}

export interface AuthTokenRow {
  id: string
  user_id: string
  purpose: AuthTokenPurpose
  expires_at: string
  consumed_at: string | null
}

export function getAuthEnv(event: H3Event): Cloudflare.Env {
  const platform = event.context.cloudflare as { env?: Cloudflare.Env } | undefined
  if (!platform?.env?.DB) {
    throw createError({ statusCode: 503, statusMessage: 'Le stockage des comptes est indisponible.' })
  }
  return platform.env
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

export function validatePassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 12 && value.length <= 128
}

export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

export async function hashToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('')
}

export async function issueAuthToken(event: H3Event, userId: string, purpose: AuthTokenPurpose, lifetimeMs: number) {
  const db = getAuthEnv(event).DB
  const token = randomToken()
  const now = Date.now()
  await db.batch([
    db.prepare('DELETE FROM auth_tokens WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL').bind(userId, purpose),
    db.prepare('INSERT INTO auth_tokens (id, user_id, token_hash, purpose, expires_at) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), userId, await hashToken(token), purpose, new Date(now + lifetimeMs).toISOString()),
  ])
  return token
}

export async function sendAuthEmail(event: H3Event, input: { to: string; subject: string; url: string; action: string }) {
  const env = getAuthEnv(event)
  const html = `<p>Bonjour,</p><p>Pour ${input.action}, cliquez sur le lien ci-dessous. Il expire dans une durée limitée.</p><p><a href="${escapeAttribute(input.url)}">${escapeHtml(input.action)}</a></p><p>Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.</p>`
  const text = `Bonjour,\n\nPour ${input.action}, ouvrez ce lien :\n${input.url}\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez ce message.`

  if (import.meta.dev) {
    console.info(`[auth email preview] to=${input.to} subject=${input.subject} url=${input.url}`)
    return
  }
  if (!env.EMAIL) {
    throw createError({ statusCode: 503, statusMessage: 'L’envoi des courriels n’est pas encore configuré.' })
  }
  await env.EMAIL.send({
    to: input.to,
    from: { email: 'noreply@corpinot.cc', name: 'Le Lac' },
    subject: input.subject,
    html,
    text,
  })
}

export function assertAuthEmailReady(event: H3Event, path: string) {
  const env = getAuthEnv(event)
  if (!import.meta.dev && !env.EMAIL) {
    throw createError({ statusCode:  503, statusMessage: 'L’envoi des courriels n’est pas encore configuré.' })
  }
  // Validate configuration before creating an account or a one-time token.
  buildAuthLink(event, path, 'configuration-check')
}

export async function createRateLimitFingerprint(event: H3Event, scope: string, identity: string) {
  const sessionPassword = useRuntimeConfig(event).session.password
  const address = getRequestHeader(event, 'cf-connecting-ip') ?? getRequestIP(event) ?? 'unknown'
  const input = new TextEncoder().encode(`${sessionPassword}:${scope}:${address}:${identity}`)
  const digest = await crypto.subtle.digest('SHA-256', input)
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('')
}

export async function enforceAuthRateLimit(event: H3Event, scope: string, identity: string, limit: number, windowMs: number) {
  const db = getAuthEnv(event).DB
  const now = Date.now()
  const fingerprint = await createRateLimitFingerprint(event, scope, identity)
  const result = await db.prepare(`
    INSERT INTO auth_rate_limits (fingerprint, window_started_at, attempts)
    VALUES (?, ?, 1)
    ON CONFLICT(fingerprint) DO UPDATE SET
      attempts = CASE WHEN auth_rate_limits.window_started_at + ? <= ? THEN 1 ELSE auth_rate_limits.attempts + 1 END,
      window_started_at = CASE WHEN auth_rate_limits.window_started_at + ? <= ? THEN ? ELSE auth_rate_limits.window_started_at END
    RETURNING attempts
  `).bind(fingerprint, now, windowMs, now, windowMs, now, now).first<{ attempts: number }>()

  if (result && result.attempts > limit) {
    setResponseHeader(event, 'Retry-After', Math.ceil(windowMs / 1000))
    throw createError({ statusCode: 429, statusMessage: 'Trop de tentatives. Réessayez plus tard.' })
  }

  // Opportunistic cleanup keeps expired fingerprints from accumulating indefinitely.
  if (now % (60 * 60 * 1000) < 60_000) {
    await db.prepare('DELETE FROM auth_rate_limits WHERE window_started_at < ?').bind(now - 24 * 60 * 60 * 1000).run()
  }
}

export function buildAuthLink(event: H3Event, path: string, token: string) {
  const cloudflareEnv = event.context.cloudflare?.env as (Cloudflare.Env & { NUXT_PUBLIC_APP_URL?: string }) | undefined
  const configuredBase = cloudflareEnv?.NUXT_PUBLIC_APP_URL || useRuntimeConfig(event).public.appUrl
  const origin = configuredBase || (import.meta.dev ? getRequestURL(event).origin : '')
  if (!origin) throw createError({ statusCode: 503, statusMessage: 'L’adresse publique de l’application n’est pas configurée.' })
  const url = new URL(path, origin)
  url.searchParams.set('token', token)
  return url.toString()
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}
