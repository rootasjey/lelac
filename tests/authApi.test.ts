// @vitest-environment node
import { DatabaseSync } from 'node:sqlite'
import * as h3 from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultDashboard, defaultDashboardDefinitions } from '../app/utils/boardConfig'

vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: (event?: h3.H3Event) => event?.context.nitro?.runtimeConfig ?? {
    session: { password: 'test-session-secret-that-is-long-enough-for-auth-utils' },
    public: { appUrl: 'https://lelac.test' },
  },
}))

const sessionWrites: unknown[] = []
const sessionClears: h3.H3Event[] = []
let authenticatedTestUser: { id: string; email: string } | null = null

function installAuthGlobals() {
  for (const name of [
    'createError', 'defineEventHandler', 'getQuery', 'getRequestHeader', 'getRequestIP', 'getRouterParam',
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
  vi.stubGlobal('requireUserSession', async () => ({ user: authenticatedTestUser }))
  vi.stubGlobal('getAuthEnv', (event: h3.H3Event) => (event.context.cloudflare as { env: Cloudflare.Env }).env)
  vi.stubGlobal('useRuntimeConfig', (event?: h3.H3Event) => event?.context.nitro?.runtimeConfig ?? {
    session: { password: 'test-session-secret-that-is-long-enough-for-auth-utils' },
    public: { appUrl: 'https://lelac.test' },
  })
}

installAuthGlobals()
const [registerModule, loginModule, resetModule, resetCompleteModule, verifyModule, accountModule, boardsGetModule, boardsPutModule, accountHandlePutModule, accountRouteModule, shareStatusModule, shareCreateModule, shareDeleteModule, publicBoardModule, publicUnlockModule] = await Promise.all([
  import('../server/api/auth/register.post'),
  import('../server/api/auth/login.post'),
  import('../server/api/auth/password-reset.post'),
  import('../server/api/auth/password-reset/complete.post'),
  import('../server/api/auth/verify.get'),
  import('../server/api/auth/account.delete'),
  import('../server/api/boards.get'),
  import('../server/api/boards.put'),
  import('../server/api/account/handle.put'),
  import('../server/api/account/route.get'),
  import('../server/api/boards/[dashboard]/share.get'),
  import('../server/api/boards/[dashboard]/share.post'),
  import('../server/api/boards/[dashboard]/share.delete'),
  import('../server/api/public/boards/[token].get'),
  import('../server/api/public/boards/[token]/unlock.post'),
])
const registerHandler = registerModule.default
const loginHandler = loginModule.default
const resetHandler = resetModule.default
const resetCompleteHandler = resetCompleteModule.default
const verifyHandler = verifyModule.default
const accountHandler = accountModule.default
const boardsGetHandler = boardsGetModule.default
const boardsPutHandler = boardsPutModule.default
const accountHandlePutHandler = accountHandlePutModule.default
const accountRouteHandler = accountRouteModule.default
const shareStatusHandler = shareStatusModule.default
const shareCreateHandler = shareCreateModule.default
const shareDeleteHandler = shareDeleteModule.default
const publicBoardHandler = publicBoardModule.default
const publicUnlockHandler = publicUnlockModule.default
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
    PRAGMA foreign_keys = ON;
    CREATE TABLE users (
      id TEXT PRIMARY KEY NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, handle TEXT UNIQUE,
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
    CREATE TABLE dashboards (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      dashboard_id TEXT NOT NULL, config_json TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, dashboard_id)
    );
    CREATE TABLE dashboard_definitions (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      dashboard_id TEXT NOT NULL, title TEXT NOT NULL, position INTEGER NOT NULL CHECK (position >= 0),
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, dashboard_id), UNIQUE (user_id, position)
    );
    CREATE TABLE dashboard_shares (
      user_id TEXT NOT NULL,
      dashboard_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT,
      password_salt TEXT,
      password_hash TEXT,
      PRIMARY KEY (user_id, dashboard_id),
      FOREIGN KEY (user_id, dashboard_id) REFERENCES dashboard_definitions(user_id, dashboard_id) ON DELETE CASCADE
    );
    CREATE TABLE dashboard_share_access_sessions (
      user_id TEXT NOT NULL, dashboard_id TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, dashboard_id, token_hash),
      FOREIGN KEY (user_id, dashboard_id) REFERENCES dashboard_shares(user_id, dashboard_id) ON DELETE CASCADE
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
  app.use('/api/auth/account', accountHandler)
  app.use('/api/account/handle', accountHandlePutHandler)
  app.use('/api/account/route', accountRouteHandler)
  app.use('/api/public/boards/', h3.defineEventHandler(async (event) => {
    const segments = new URL(event.node.req.url ?? '/', 'https://lelac.test').pathname.split('/')
    const unlock = segments.at(-1) === 'unlock'
    const token = (unlock ? segments.at(-2) : segments.at(-1)) ?? ''
    event.context.params = { token }
    if (unlock && event.method === 'POST') return publicUnlockHandler(event)
    return publicBoardHandler(event)
  }))
  app.use('/api/boards', h3.defineEventHandler(async (event) => {
    const shareMatch = h3.getRequestURL(event).pathname.match(/(?:^|\/)boards\/([^/]+)\/share$/)
    if (shareMatch) {
      event.context.params = { dashboard: decodeURIComponent(shareMatch[1]!) }
      if (event.method === 'GET') return shareStatusHandler(event)
      if (event.method === 'POST') return shareCreateHandler(event)
      if (event.method === 'DELETE') return shareDeleteHandler(event)
      throw h3.createError({ statusCode: 405 })
    }
    if (event.method === 'GET') return boardsGetHandler(event)
    if (event.method === 'PUT') return boardsPutHandler(event)
    throw h3.createError({ statusCode: 405, statusMessage: 'Method not allowed' })
  }))
  const handle = h3.toWebHandler(app)
  return (path: string, body?: unknown, method = 'POST', extraHeaders: Record<string, string> = {}) => handle(new Request(`https://lelac.test${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), 'cf-connecting-ip': '203.0.113.10', ...extraHeaders },
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
    authenticatedTestUser = null
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

    const user = database.d1.prepare('SELECT email, password_hash, email_verified_at, handle FROM users WHERE email = ?')
      .bind('new@example.com').first<{ email: string; password_hash: string; email_verified_at: string | null; handle: string }>()
    expect(user).toMatchObject({ email: 'new@example.com', password_hash: `test-hash:${password}`, email_verified_at: null })
    expect(user?.handle).toMatch(/^[a-z]+-[a-z]+-[abcdefghjkmnpqrstuvwxyz23456789]{4}$/)
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

  it('requires password and explicit confirmation before deleting an account and its dashboards', async () => {
    await request('/api/auth/register', { email: 'delete-me@example.com', password: 'account-password-123' })
    const user = database.d1.prepare('SELECT id FROM users WHERE email = ?')
      .bind('delete-me@example.com').first<{ id: string }>()
    authenticatedTestUser = { id: user!.id, email: 'delete-me@example.com' }
    database.d1.prepare('INSERT INTO dashboards (user_id, dashboard_id, config_json) VALUES (?, ?, ?)')
      .bind(user!.id, 'daily', '{}').run()

    const wrongPassword = await request('/api/auth/account', { password: 'incorrect-password', confirmation: 'SUPPRIMER' }, 'DELETE')
    expect(wrongPassword.status).toBe(403)
    expect(database.d1.prepare('SELECT COUNT(*) AS count FROM users').first<{ count: number }>()?.count).toBe(1)
    expect(database.d1.prepare('SELECT COUNT(*) AS count FROM dashboards').first<{ count: number }>()?.count).toBe(1)

    const missingConfirmation = await request('/api/auth/account', { password: 'account-password-123', confirmation: 'supprimer' }, 'DELETE')
    expect(missingConfirmation.status).toBe(400)
    expect(database.d1.prepare('SELECT COUNT(*) AS count FROM users').first<{ count: number }>()?.count).toBe(1)

    const deleted = await request('/api/auth/account', { password: 'account-password-123', confirmation: 'SUPPRIMER' }, 'DELETE')
    expect(deleted.status).toBe(200)
    expect(await deleted.json()).toEqual({ ok: true })
    expect(database.d1.prepare('SELECT COUNT(*) AS count FROM users').first<{ count: number }>()?.count).toBe(0)
    expect(database.d1.prepare('SELECT COUNT(*) AS count FROM dashboards').first<{ count: number }>()?.count).toBe(0)
    expect(database.d1.prepare('SELECT COUNT(*) AS count FROM auth_tokens').first<{ count: number }>()?.count).toBe(0)
    expect(sessionClears).toHaveLength(1)
  })

  it('requires a session and rejects invalid dashboard collections before writing', async () => {
    expect((await request('/api/boards', undefined, 'GET')).status).toBe(401)
    expect((await request('/api/boards', { dashboards: [] }, 'PUT')).status).toBe(401)

    database.d1.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)')
      .bind('board-owner', 'board-owner@example.com', 'test-hash:password').run()
    authenticatedTestUser = { id: 'board-owner', email: 'board-owner@example.com' }

    const invalidDefinitions = await request('/api/boards', { dashboards: [{ id: 'daily', title: ' ', order: 0, config: defaultDashboard('daily') }] }, 'PUT')
    expect(invalidDefinitions.status).toBe(400)

    const invalidConfig = await request('/api/boards', { dashboards: [{ id: 'daily', title: 'Quotidien', order: 0, config: { version: 99, widgets: [] } }] }, 'PUT')
    expect(invalidConfig.status).toBe(400)
    expect(database.d1.prepare('SELECT COUNT(*) AS count FROM dashboard_definitions').first<{ count: number }>()?.count).toBe(0)
    expect(database.d1.prepare('SELECT COUNT(*) AS count FROM dashboards').first<{ count: number }>()?.count).toBe(0)
  })

  it('persists ordered custom dashboards per account and reads them back', async () => {
    database.d1.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?), (?, ?, ?)')
      .bind('board-owner-a', 'board-a@example.com', 'test-hash:password', 'board-owner-b', 'board-b@example.com', 'test-hash:password').run()
    authenticatedTestUser = { id: 'board-owner-a', email: 'board-a@example.com' }

    const customId = '123e4567-e89b-42d3-a456-426614174000'
    const saved = await request('/api/boards', { dashboards: [
      { ...defaultDashboardDefinitions[0]!, order: 0, config: defaultDashboard('daily') },
      { id: customId, title: 'Voyages', order: 1, config: defaultDashboard(customId) },
    ] }, 'PUT')
    expect(saved.status).toBe(200)
    expect(await saved.json()).toEqual({ ok: true })

    const ownerRead = await request('/api/boards', undefined, 'GET')
    expect(ownerRead.status).toBe(200)
    expect(await ownerRead.json()).toMatchObject({
      hasStoredDashboards: true,
      dashboards: [
        { id: 'daily', title: 'Quotidien', order: 0 },
        { id: customId, title: 'Voyages', order: 1 },
      ],
    })

    authenticatedTestUser = { id: 'board-owner-b', email: 'board-b@example.com' }
    const otherRead = await request('/api/boards', undefined, 'GET')
    expect(otherRead.status).toBe(200)
    expect(await otherRead.json()).toMatchObject({
      hasStoredDashboards: false,
      dashboards: defaultDashboardDefinitions,
    })
    expect(database.d1.prepare('SELECT COUNT(*) AS count FROM dashboard_definitions WHERE user_id = ?')
      .bind('board-owner-b').first<{ count: number }>()?.count).toBe(0)
  })

  it('shares only the selected dashboard through a private, revocable public token', async () => {
    database.d1.prepare('INSERT INTO users (id, email, password_hash, handle) VALUES (?, ?, ?, ?)')
      .bind('share-owner', 'share-owner@example.com', 'test-hash:password', 'share-owner').run()
    authenticatedTestUser = { id: 'share-owner', email: 'share-owner@example.com' }
    await request('/api/boards', { dashboards: [
      { ...defaultDashboardDefinitions[0]!, order: 0, config: defaultDashboard('daily') },
      { ...defaultDashboardDefinitions[1]!, order: 1, config: defaultDashboard('tech') },
    ] }, 'PUT')

    expect((await request('/api/boards/daily/share', undefined, 'GET')).status).toBe(200)
    expect(await (await request('/api/boards/daily/share', undefined, 'GET')).json()).toEqual({ enabled: false, expiresAt: null, passwordProtected: false })
    expect((await request('/api/boards/daily/share', { expirationDays: 14 })).status).toBe(400)
    const created = await request('/api/boards/daily/share', { expirationDays: 7 })
    expect(created.status).toBe(200)
    const createdBody = await created.json() as { enabled: boolean; path: string; expiresAt: string }
    const token = createdBody.path.split('/').at(-1)!
    expect(createdBody.enabled).toBe(true)
    expect(createdBody.expiresAt).toBeTruthy()
    const expiresAt = Date.parse(createdBody.expiresAt)
    expect(expiresAt).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000)
    expect(expiresAt).toBeLessThan(Date.now() + 8 * 24 * 60 * 60 * 1000)
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,50}$/)
    expect(database.d1.prepare('SELECT token_hash FROM dashboard_shares WHERE dashboard_id = ?')
      .bind('daily').first<{ token_hash: string }>()?.token_hash).not.toBe(token)

    authenticatedTestUser = null
    const publicRead = await request(`/api/public/boards/${token}`, undefined, 'GET')
    expect(publicRead.status).toBe(200)
    expect(publicRead.headers.get('cache-control')).toContain('no-store')
    expect(publicRead.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect(await publicRead.json()).toEqual({
      dashboardId: 'daily',
      title: 'Quotidien',
      config: defaultDashboard('daily'),
    })
    expect((await request('/api/boards/daily/share', undefined, 'GET')).status).toBe(401)

    authenticatedTestUser = { id: 'share-owner', email: 'share-owner@example.com' }
    const rotated = await request('/api/boards/daily/share', { expirationDays: null })
    const rotatedBody = await rotated.json() as { path: string; expiresAt: string | null }
    const rotatedToken = rotatedBody.path.split('/').at(-1)!
    expect(rotatedToken).not.toBe(token)
    expect(rotatedBody.expiresAt).toBeNull()
    expect((await request(`/api/public/boards/${token}`, undefined, 'GET')).status).toBe(404)
    expect((await request(`/api/public/boards/${rotatedToken}`, undefined, 'GET')).status).toBe(200)

    database.d1.prepare('UPDATE dashboard_shares SET expires_at = ? WHERE dashboard_id = ?')
      .bind('2000-01-01T00:00:00.000Z', 'daily').run()
    expect((await request(`/api/public/boards/${rotatedToken}`, undefined, 'GET')).status).toBe(404)

    await request('/api/boards/daily/share', undefined, 'DELETE')
    expect((await request(`/api/public/boards/${rotatedToken}`, undefined, 'GET')).status).toBe(404)
  })

  it('protects a shared dashboard with a password and a scoped HttpOnly access cookie', async () => {
    database.d1.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)')
      .bind('share-owner', 'share-owner@example.com', 'test-hash:password').run()
    authenticatedTestUser = { id: 'share-owner', email: 'share-owner@example.com' }
    await request('/api/boards', { dashboards: [
      { ...defaultDashboardDefinitions[0]!, order: 0, config: defaultDashboard('daily') },
    ] }, 'PUT')

    const created = await request('/api/boards/daily/share', {
      expirationDays: 7,
      protectWithPassword: true,
      password: 'lake-view-passphrase',
    })
    expect(created.status).toBe(200)
    const createdBody = await created.json() as { enabled: boolean; passwordProtected: boolean; path: string }
    expect(createdBody).toMatchObject({ enabled: true, passwordProtected: true })
    const token = createdBody.path.split('/').at(-1)!
    const shareRow = database.d1.prepare('SELECT password_salt, password_hash FROM dashboard_shares WHERE dashboard_id = ?')
      .bind('daily').first<{ password_salt: string; password_hash: string }>()
    expect(shareRow?.password_hash).not.toContain('lake-view-passphrase')
    expect(shareRow?.password_salt).toMatch(/^[0-9a-f]{32}$/)
    expect(shareRow?.password_hash).toMatch(/^[0-9a-f]{64}$/)

    authenticatedTestUser = null
    const locked = await request(`/api/public/boards/${token}`, undefined, 'GET')
    expect(locked.status).toBe(401)
    expect(locked.headers.get('cache-control')).toContain('no-store')

    const wrongPassword = await request(`/api/public/boards/${token}/unlock`, { password: 'wrong-passphrase' })
    expect(wrongPassword.status).toBe(401)
    const unlocked = await request(`/api/public/boards/${token}/unlock`, { password: 'lake-view-passphrase' })
    expect(unlocked.status).toBe(200)
    const cookie = unlocked.headers.get('set-cookie')!
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain(`/api/public/boards/${token}`)
    const cookiePair = cookie.split(';', 1)[0]!
    expect((await request(`/api/public/boards/${token}`, undefined, 'GET', { cookie: cookiePair })).status).toBe(200)

    for (let attempt = 0; attempt < 8; attempt++) {
      expect((await request(`/api/public/boards/${token}/unlock`, { password: 'wrong-passphrase' })).status).toBe(401)
    }
    const rateLimited = await request(`/api/public/boards/${token}/unlock`, { password: 'wrong-passphrase' })
    expect(rateLimited.status).toBe(429)
    expect(rateLimited.headers.get('retry-after')).toBeTruthy()

    const shortExpiry = new Date(Date.now() + 60_000).toISOString()
    database.d1.prepare('UPDATE dashboard_shares SET expires_at = ? WHERE dashboard_id = ?').bind(shortExpiry, 'daily').run()
    const shortLivedUnlock = await request(`/api/public/boards/${token}/unlock`, { password: 'lake-view-passphrase' }, 'POST', { 'cf-connecting-ip': '203.0.113.11' })
    expect(shortLivedUnlock.status).toBe(200)
    const shortLivedCookie = shortLivedUnlock.headers.get('set-cookie')!
    const maxAge = Number(shortLivedCookie.match(/Max-Age=(\d+)/i)?.[1])
    expect(maxAge).toBeGreaterThan(0)
    expect(maxAge).toBeLessThanOrEqual(60)

    database.d1.prepare('UPDATE dashboard_shares SET expires_at = ? WHERE dashboard_id = ?')
      .bind('2000-01-01T00:00:00.000Z', 'daily').run()
    expect((await request(`/api/public/boards/${token}`, undefined, 'GET', { cookie: shortLivedCookie.split(';', 1)[0]! })).status).toBe(404)

    authenticatedTestUser = { id: 'share-owner', email: 'share-owner@example.com' }
    expect(await (await request('/api/boards/daily/share', undefined, 'GET')).json()).toMatchObject({ enabled: true, passwordProtected: true })
    const replacement = await request('/api/boards/daily/share', { expirationDays: null, protectWithPassword: false })
    const replacementToken = (await replacement.json() as { path: string }).path.split('/').at(-1)!
    expect((await request(`/api/public/boards/${token}`, undefined, 'GET', { cookie: cookiePair })).status).toBe(404)
    expect((await request(`/api/public/boards/${replacementToken}`, undefined, 'GET')).status).toBe(200)
    expect(database.d1.prepare('SELECT COUNT(*) AS count FROM dashboard_share_access_sessions WHERE dashboard_id = ?')
      .bind('daily').first<{ count: number }>()?.count).toBe(0)
  })

  it('keeps a share link when board settings change and revokes it when the board is deleted', async () => {
    database.d1.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)')
      .bind('share-owner', 'share-owner@example.com', 'test-hash:password').run()
    authenticatedTestUser = { id: 'share-owner', email: 'share-owner@example.com' }
    await request('/api/boards', { dashboards: [
      { ...defaultDashboardDefinitions[0]!, order: 0, config: defaultDashboard('daily') },
      { ...defaultDashboardDefinitions[1]!, order: 1, config: defaultDashboard('tech') },
    ] }, 'PUT')
    const created = await request('/api/boards/daily/share')
    const createdBody = await created.json() as { path: string; expiresAt: string }
    const token = createdBody.path.split('/').at(-1)!
    expect(Date.parse(createdBody.expiresAt)).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000)

    await request('/api/boards', { dashboards: [
      { ...defaultDashboardDefinitions[1]!, order: 0, config: defaultDashboard('tech') },
      { ...defaultDashboardDefinitions[0]!, order: 1, title: 'Mon quotidien', config: defaultDashboard('daily') },
    ] }, 'PUT')
    expect(await (await request('/api/boards/daily/share', undefined, 'GET')).json()).toMatchObject({ enabled: true })
    expect((await request(`/api/public/boards/${token}`, undefined, 'GET')).status).toBe(200)

    await request('/api/boards', { dashboards: [
      { ...defaultDashboardDefinitions[1]!, order: 0, config: defaultDashboard('tech') },
    ] }, 'PUT')
    expect((await request(`/api/public/boards/${token}`, undefined, 'GET')).status).toBe(404)
  })

  it('keeps account routes private and redirects a mismatched handle to the signed-in account', async () => {
    expect((await request('/api/account/route?handle=%40corpinot', undefined, 'GET')).status).toBe(401)
    database.d1.prepare('INSERT INTO users (id, email, password_hash, handle) VALUES (?, ?, ?, ?)')
      .bind('route-owner', 'route-owner@example.com', 'test-hash:password', 'corpinot').run()
    authenticatedTestUser = { id: 'route-owner', email: 'route-owner@example.com' }

    const ownRoute = await request('/api/account/route?handle=%40corpinot&dashboard=cinema', undefined, 'GET')
    expect(ownRoute.status).toBe(200)
    expect(await ownRoute.json()).toEqual({ handle: 'corpinot', dashboardId: 'cinema', redirect: '' })

    const mismatchedRoute = await request('/api/account/route?handle=%40someone-else&dashboard=cinema', undefined, 'GET')
    expect(mismatchedRoute.status).toBe(200)
    expect(await mismatchedRoute.json()).toEqual({ handle: 'corpinot', dashboardId: 'cinema', redirect: '/@corpinot/board/cinema' })
  })

  it('lets an authenticated user change their public account handle and rejects duplicates', async () => {
    database.d1.prepare('INSERT INTO users (id, email, password_hash, handle) VALUES (?, ?, ?, ?), (?, ?, ?, ?)')
      .bind('handle-owner', 'handle-owner@example.com', 'test-hash:password', 'old-handle', 'handle-other', 'handle-other@example.com', 'test-hash:password', 'taken-handle').run()
    authenticatedTestUser = { id: 'handle-owner', email: 'handle-owner@example.com' }

    const current = await request('/api/boards', undefined, 'GET')
    expect(await current.json()).toMatchObject({ accountHandle: 'old-handle' })
    const updated = await request('/api/account/handle', { handle: '  Corpinot ' }, 'PUT')
    expect(updated.status).toBe(200)
    expect(await updated.json()).toEqual({ handle: 'corpinot' })
    const duplicate = await request('/api/account/handle', { handle: 'taken-handle' }, 'PUT')
    expect(duplicate.status).toBe(409)
    const invalid = await request('/api/account/handle', { handle: 'no/slash' }, 'PUT')
    expect(invalid.status).toBe(400)
  })
})
