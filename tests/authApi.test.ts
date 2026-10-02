// @vitest-environment node
import { DatabaseSync } from 'node:sqlite'
import * as h3 from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: (event?: h3.H3Event) => event?.context.nitro?.runtimeConfig ?? {
    session: { password: 'test-session-secret-that-is-long-enough-for-auth-utils' },
    public: { appUrl: 'https://lelac.test' },
  },
}))

const sessionWrites: unknown[] = []
const sessionClears: h3.H3Event[] = []

function installAuthGlobals() {
  for (const name of [
    'createError', 'defineEventHandler', 'getQuery', 'getRequestHeader', 'getRequestIP',
    'getRequestURL', 'readBody', 'sendRedirect', 'setResponseHeader',
  ] as const) vi.stubGlobal(name, h3[name])
  vi.stubGlobal('hashPassword', async (password: string) => `test-hash:${password}`)
  vi.stubGlobal('verifyPassword', async (hash: string, password: string) => hash === `test-hash:${password}`)
  vi.stubGlobal('setUserSession', async (_event: h3.H3Event, session: unknown) => {
    sessionWrites.push(session)
    return session
  })
  vi.stubGlobal('clearUserSession', async (event: h3.H3Event) => {
    sessionClears.push(event)
  })
  vi.stubGlobal('useRuntimeConfig', (event?: h3.H3Event) => event?.context.nitro?.runtimeConfig ?? {
    session: { password: 'test-session-secret-that-is-long-enough-for-auth-utils' },
    public: { appUrl: 'https://lelac.test' },
  })
}

installAuthGlobals()
const [registerModule, loginModule, resetModule, resetCompleteModule, verifyModule] = await Promise.all([
  import('../server/api/auth/register.post'),
  import('../server/api/auth/login.post'),
  import('../server/api/auth/password-reset.post'),
  import('../server/api/auth/password-reset/complete.post'),
  import('../server/api/auth/verify.get'),
])
const registerHandler = registerModule.default
const loginHandler = loginModule.default
const resetHandler = resetModule.default
const resetCompleteHandler = resetCompleteModule.default
const verifyHandler = verifyModule.default
const { hashToken } = await import('../server/utils/auth')

class SQLiteD1Statement {
  constructor(private readonly database: DatabaseSync, private readonly sql: string, private readonly values: unknown[] = []) {}
  bind(...values: unknown[]) { return new SQLiteD1Statement(this.database, this.sql, values) }
  first<T>() { return (this.database.prepare(this.sql).get(...this.values) as T | undefined) ?? null }
  all<T>() { return { results: this.database.prepare(this.sql).all(...this.values) as T[] } }
  run() { return this.database.prepare(this.sql).run(...this.values) }
}

function createD1TestDatabase() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
      email_verified_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE auth_tokens (
      id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE, purpose TEXT NOT NULL, expires_at TEXT NOT NULL,
      consumed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE auth_rate_limits (
      fingerprint TEXT PRIMARY KEY NOT NULL, window_started_at INTEGER NOT NULL, attempts INTEGER NOT NULL
    );
  `)
  const d1 = {
    prepare: (sql: string) => new SQLiteD1Statement(sqlite, sql),
    batch: (statements: SQLiteD1Statement[]) => {
      sqlite.exec('BEGIN')
      try {
        const results = statements.map(statement => statement.run())
        sqlite.exec('COMMIT')
        return results
      } catch (error) {
        sqlite.exec('ROLLBACK')
        throw error
      }
    },
  } as unknown as Cloudflare.Env['DB']

  return { d1, close: () => sqlite.close() }
}

function createAuthApi(db: Cloudflare.Env['DB']) {
  const app = h3.createApp()
  app.use((event) => {
    event.context.cloudflare = { env: { DB: db, EMAIL: { send: vi.fn() }, NUXT_PUBLIC_APP_URL: 'https://lelac.test' } } as never
    event.context.nitro = { runtimeConfig: {
      session: { password: 'test-session-secret-that-is-long-enough-for-auth-utils' },
      hash: { scrypt: {} },
      public: { appUrl: 'https://lelac.test' },
    } } as never
  })
  app.use('/api/auth/register', registerHandler)
  app.use('/api/auth/login', loginHandler)
  app.use('/api/auth/password-reset/complete', resetCompleteHandler)
  app.use('/api/auth/password-reset', resetHandler)
  app.use('/api/auth/verify', verifyHandler)
  const handle = h3.toWebHandler(app)
  return (path: string, body?: unknown, method = 'POST') => handle(new Request(`https://lelac.test${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), 'cf-connecting-ip': '203.0.113.10' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }))
}

describe('auth API', () => {
  let database: ReturnType<typeof createD1TestDatabase>
  let request: ReturnType<typeof createAuthApi>

  beforeEach(() => {
    installAuthGlobals()
    sessionWrites.length = 0
    sessionClears.length = 0
    database = createD1TestDatabase()
    request = createAuthApi(database.d1)
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    database.close()
  })

  it('creates a pending account and returns the same generic registration response for an existing account', async () => {
    const password = 'correct-horse-battery'
    const first = await request('/api/auth/register', { email: '  NEW@EXAMPLE.COM ', password })
    expect(first.status).toBe(200)
    const firstBody = await first.json()
    expect(firstBody).toEqual({ ok: true, message: 'Si cette adresse peut recevoir un lien de vérification, un e-mail va être envoyé.' })

    const user = database.d1.prepare('SELECT email, password_hash, email_verified_at FROM users WHERE email = ?')
      .bind('new@example.com').first<{ email: string; password_hash: string; email_verified_at: string | null }>()
    expect(user).toEqual({ email: 'new@example.com', password_hash: `test-hash:${password}`, email_verified_at: null })
    const tokenCount = database.d1.prepare('SELECT COUNT(*) AS count FROM auth_tokens').first<{ count: number }>()
    expect(tokenCount?.count).toBe(1)

    const second = await request('/api/auth/register', { email: 'NEW@example.com', password })
    expect(second.status).toBe(200)
    expect(await second.json()).toEqual(firstBody)
    expect(database.d1.prepare('SELECT COUNT(*) AS count FROM users').first<{ count: number }>()?.count).toBe(1)
  })

  it('rejects invalid registration input and rate-limits repeated registration requests', async () => {
    const invalid = await request('/api/auth/register', { email: 'bad-address', password: 'short' })
    expect(invalid.status).toBe(400)

    const body = { email: 'limit@example.com', password: 'long-enough-password' }
    const attempts = await Promise.all([1, 2, 3].map(() => request('/api/auth/register', body)))
    expect(attempts.map(response => response.status)).toEqual([200, 200, 200])
    const blocked = await request('/api/auth/register', body)
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('retry-after')).toBe('3600')
  })

  it('uses the same login error for unknown accounts and wrong passwords, and only starts verified sessions', async () => {
    await request('/api/auth/register', { email: 'ready@example.com', password: 'correct-login-password' })
    database.d1.prepare('UPDATE users SET email_verified_at = ? WHERE email = ?')
      .bind('2026-10-02T12:00:00.000Z', 'ready@example.com').run()
    await request('/api/auth/register', { email: 'pending@example.com', password: 'pending-login-password' })

    const unknown = await request('/api/auth/login', { email: 'missing@example.com', password: 'wrong-password' })
    expect(unknown.status).toBe(401)
    const unknownBody = await unknown.json()

    const wrongPassword = await request('/api/auth/login', { email: 'ready@example.com', password: 'wrong-password' })
    expect(wrongPassword.status).toBe(401)
    expect(await wrongPassword.json()).toEqual(unknownBody)

    const unverified = await request('/api/auth/login', { email: 'pending@example.com', password: 'pending-login-password' })
    expect(unverified.status).toBe(403)
    expect(sessionWrites).toHaveLength(0)

    const verified = await request('/api/auth/login', { email: ' READY@example.com ', password: 'correct-login-password' })
    expect(verified.status).toBe(200)
    expect(sessionWrites).toEqual([{ user: { id: expect.any(String), email: 'ready@example.com', emailVerified: true } }])
  })

  it('rate-limits repeated login attempts for an email address', async () => {
    const body = { email: 'target@example.com', password: 'wrong-password' }
    const attempts = await Promise.all([1, 2, 3, 4, 5, 6, 7, 8].map(() => request('/api/auth/login', body)))
    expect(attempts.map(response => response.status)).toEqual(Array(8).fill(401))
    const blocked = await request('/api/auth/login', body)
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('retry-after')).toBe('900')
  })

  it('keeps password-reset requests indistinguishable for unknown and verified accounts', async () => {
    await request('/api/auth/register', { email: 'reset@example.com', password: 'existing-password' })
    database.d1.prepare('UPDATE users SET email_verified_at = ? WHERE email = ?')
      .bind('2026-10-02T12:00:00.000Z', 'reset@example.com').run()

    const known = await request('/api/auth/password-reset', { email: 'RESET@example.com' })
    const unknown = await request('/api/auth/password-reset', { email: 'missing@example.com' })
    expect(known.status).toBe(200)
    expect(unknown.status).toBe(200)
    const knownBody = await known.json()
    expect(await unknown.json()).toEqual(knownBody)
    expect(knownBody).toEqual({
      ok: true,
      message: 'Si un compte vérifié correspond à cette adresse, un lien de réinitialisation va être envoyé.',
    })
    expect(database.d1.prepare("SELECT COUNT(*) AS count FROM auth_tokens WHERE purpose = 'reset-password'")
      .first<{ count: number }>()?.count).toBe(1)
  })

  it('accepts one valid password-reset link, updates the password, and clears the session', async () => {
    await request('/api/auth/register', { email: 'complete-reset@example.com', password: 'old-login-password' })
    const user = database.d1.prepare('SELECT id FROM users WHERE email = ?')
      .bind('complete-reset@example.com').first<{ id: string }>()
    const token = 'reset-token-for-api-test-00000000000000000000000000000000'
    database.d1.prepare('INSERT INTO auth_tokens (id, user_id, token_hash, purpose, expires_at) VALUES (?, ?, ?, ?, ?)')
      .bind('reset-token-id', user!.id, await hashToken(token), 'reset-password', '2030-01-01T00:00:00.000Z').run()

    const invalidPassword = await request('/api/auth/password-reset/complete', { token, password: 'too-short' })
    expect(invalidPassword.status).toBe(400)
    expect(database.d1.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user!.id).first<{ password_hash: string }>()?.password_hash)
      .toBe('test-hash:old-login-password')

    const completed = await request('/api/auth/password-reset/complete', { token, password: 'new-login-password' })
    expect(completed.status, await completed.clone().text()).toBe(200)
    expect(await completed.json()).toEqual({ ok: true, message: 'Votre mot de passe a été modifié. Vous pouvez vous connecter.' })
    expect(database.d1.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user!.id).first<{ password_hash: string }>()?.password_hash)
      .toBe('test-hash:new-login-password')
    expect(database.d1.prepare('SELECT consumed_at FROM auth_tokens WHERE id = ?').bind('reset-token-id').first<{ consumed_at: string | null }>()?.consumed_at)
      .toEqual(expect.any(String))
    expect(sessionClears).toHaveLength(1)

    const replay = await request('/api/auth/password-reset/complete', { token, password: 'another-login-password' })
    expect(replay.status).toBe(400)
    expect(sessionClears).toHaveLength(1)
  })

  it('verifies an address once, starts a verified session, and rejects an expired link', async () => {
    await request('/api/auth/register', { email: 'verify@example.com', password: 'verification-password' })
    const user = database.d1.prepare('SELECT id FROM users WHERE email = ?')
      .bind('verify@example.com').first<{ id: string }>()
    const token = 'verify-token-for-api-test-00000000000000000000000000000000'
    await database.d1.prepare('INSERT INTO auth_tokens (id, user_id, token_hash, purpose, expires_at) VALUES (?, ?, ?, ?, ?)')
      .bind('verify-token-id', user!.id, await hashToken(token), 'verify-email', '2030-01-01T00:00:00.000Z').run()

    const verified = await request(`/api/auth/verify?token=${token}`, undefined, 'GET')
    expect(verified.status).toBe(303)
    expect(verified.headers.get('location')).toBe('/?verified=1')
    expect(database.d1.prepare('SELECT email_verified_at FROM users WHERE id = ?').bind(user!.id).first<{ email_verified_at: string | null }>()?.email_verified_at)
      .toEqual(expect.any(String))
    expect(sessionWrites).toEqual([{ user: { id: user!.id, email: 'verify@example.com', emailVerified: true } }])

    const replay = await request(`/api/auth/verify?token=${token}`, undefined, 'GET')
    expect(replay.status).toBe(303)
    expect(replay.headers.get('location')).toBe('/login?verification=invalid')
    expect(sessionWrites).toHaveLength(1)

    const expiredToken = 'expired-verify-token-for-api-test-00000000000000000000000000000'
    await database.d1.prepare('INSERT INTO auth_tokens (id, user_id, token_hash, purpose, expires_at) VALUES (?, ?, ?, ?, ?)')
      .bind('expired-token-id', user!.id, await hashToken(expiredToken), 'verify-email', '2020-01-01T00:00:00.000Z').run()
    const expired = await request(`/api/auth/verify?token=${expiredToken}`, undefined, 'GET')
    expect(expired.status).toBe(303)
    expect(expired.headers.get('location')).toBe('/login?verification=invalid')
  })
})
