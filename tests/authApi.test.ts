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
  vi.stubGlobal('useRuntimeConfig', (event?: h3.H3Event) => event?.context.nitro?.runtimeConfig ?? {
    session: { password: 'test-session-secret-that-is-long-enough-for-auth-utils' },
    public: { appUrl: 'https://lelac.test' },
  })
}

installAuthGlobals()
const [registerModule, loginModule] = await Promise.all([
  import('../server/api/auth/register.post'),
  import('../server/api/auth/login.post'),
])
const registerHandler = registerModule.default
const loginHandler = loginModule.default

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
  const handle = h3.toWebHandler(app)
  return (path: string, body: unknown) => handle(new Request(`https://lelac.test${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.10' },
    body: JSON.stringify(body),
  }))
}

describe('auth API', () => {
  let database: ReturnType<typeof createD1TestDatabase>
  let request: ReturnType<typeof createAuthApi>

  beforeEach(() => {
    installAuthGlobals()
    sessionWrites.length = 0
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
})
