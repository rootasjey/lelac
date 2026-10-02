// @vitest-environment node
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { hashToken, normalizeEmail, resetPasswordWithToken, validatePassword, verifyUserEmailWithToken } from '../server/utils/auth'
import { loadDashboardRows, saveDashboardRows } from '../server/utils/dashboardStorage'

class SQLiteD1Statement {
  constructor(
    private readonly database: DatabaseSync,
    private readonly sql: string,
    private readonly values: unknown[] = [],
  ) {}

  bind(...values: unknown[]) {
    return new SQLiteD1Statement(this.database, this.sql, values)
  }

  first<T>() {
    return (this.database.prepare(this.sql).get(...this.values) as T | undefined) ?? null
  }

  all<T>() {
    return { results: this.database.prepare(this.sql).all(...this.values) as T[] }
  }

  run() {
    return this.database.prepare(this.sql).run(...this.values)
  }
}

function createD1TestDatabase() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(readFileSync(new URL('../migrations/0001_auth_and_dashboards.sql', import.meta.url), 'utf8'))
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

describe('auth security rules', () => {
  let database: ReturnType<typeof createD1TestDatabase>

  beforeEach(() => {
    database = createD1TestDatabase()
  })

  afterEach(() => database.close())

  it('normalizes email addresses and enforces password length boundaries', () => {
    expect(normalizeEmail('  JEREMIE@EXAMPLE.COM  ')).toBe('jeremie@example.com')
    expect(normalizeEmail('not an email')).toBeNull()
    expect(validatePassword('a'.repeat(11))).toBe(false)
    expect(validatePassword('a'.repeat(12))).toBe(true)
    expect(validatePassword('a'.repeat(128))).toBe(true)
    expect(validatePassword('a'.repeat(129))).toBe(false)
  })

  it('verifies an address once and rejects wrong-purpose or expired verification tokens', async () => {
    const userId = 'user-1'
    const now = '2026-10-02T12:00:00.000Z'
    const validToken = 'valid-verification-token-012345678901234567890123456789'
    const wrongPurposeToken = 'wrong-purpose-token-012345678901234567890123456789'
    const expiredToken = 'expired-token-0123456789012345678901234567890123'

    database.d1.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)')
      .bind(userId, 'user@example.com', 'hash').run()
    for (const [id, token, purpose, expiresAt] of [
      ['valid', validToken, 'verify-email', '2026-10-02T13:00:00.000Z'],
      ['wrong-purpose', wrongPurposeToken, 'reset-password', '2026-10-02T13:00:00.000Z'],
      ['expired', expiredToken, 'verify-email', '2026-10-02T11:59:59.000Z'],
    ]) {
      database.d1.prepare('INSERT INTO auth_tokens (id, user_id, token_hash, purpose, expires_at) VALUES (?, ?, ?, ?, ?)')
        .bind(id, userId, await hashToken(token), purpose, expiresAt).run()
    }

    await expect(verifyUserEmailWithToken(database.d1, validToken, now)).resolves.toEqual({ id: userId, email: 'user@example.com' })
    await expect(verifyUserEmailWithToken(database.d1, validToken, now)).resolves.toBeNull()
    await expect(verifyUserEmailWithToken(database.d1, wrongPurposeToken, now)).resolves.toBeNull()
    await expect(verifyUserEmailWithToken(database.d1, expiredToken, now)).resolves.toBeNull()

    const user = database.d1.prepare('SELECT email_verified_at FROM users WHERE id = ?').bind(userId).first<{ email_verified_at: string }>()
    expect(user?.email_verified_at).toBe(now)
  })

  it('changes a password only when its reset token is valid and unused', async () => {
    const userId = 'reset-user'
    const now = '2026-10-02T12:00:00.000Z'
    const validToken = 'valid-reset-token-012345678901234567890123456789'
    const expiredToken = 'expired-reset-token-012345678901234567890123456789'
    database.d1.prepare('INSERT INTO users (id, email, password_hash, email_verified_at) VALUES (?, ?, ?, ?)')
      .bind(userId, 'reset@example.com', 'old-hash', now).run()
    for (const [id, token, expiresAt] of [
      ['valid-reset', validToken, '2026-10-02T13:00:00.000Z'],
      ['expired-reset', expiredToken, '2026-10-02T11:59:59.000Z'],
    ]) {
      database.d1.prepare('INSERT INTO auth_tokens (id, user_id, token_hash, purpose, expires_at) VALUES (?, ?, ?, ?, ?)')
        .bind(id, userId, await hashToken(token), 'reset-password', expiresAt).run()
    }

    await expect(resetPasswordWithToken(database.d1, validToken, 'new-hash', now)).resolves.toEqual({ user_id: userId })
    await expect(resetPasswordWithToken(database.d1, validToken, 'should-not-apply', now)).resolves.toBeNull()
    await expect(resetPasswordWithToken(database.d1, expiredToken, 'should-not-apply', now)).resolves.toBeNull()

    const user = database.d1.prepare('SELECT password_hash FROM users WHERE id = ?').bind(userId).first<{ password_hash: string }>()
    expect(user?.password_hash).toBe('new-hash')
  })
})

describe('account-scoped dashboard storage', () => {
  let database: ReturnType<typeof createD1TestDatabase>

  beforeEach(() => {
    database = createD1TestDatabase()
  })

  afterEach(() => database.close())

  it('keeps dashboard reads and writes isolated by user, even for the same dashboard id', async () => {
    const userAConfig = { widgets: [{ id: 'only-a', title: 'A' }] }
    const userBConfig = { widgets: [{ id: 'only-b', title: 'B' }] }
    for (const [id, email] of [['user-a', 'a@example.com'], ['user-b', 'b@example.com']]) {
      database.d1.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)')
        .bind(id, email, 'hash').run()
    }
    await saveDashboardRows(database.d1, 'user-a', [{ id: 'daily', config: userAConfig }], '2026-10-02T12:00:00.000Z')
    await saveDashboardRows(database.d1, 'user-b', [{ id: 'daily', config: userBConfig }], '2026-10-02T12:00:00.000Z')

    expect((await loadDashboardRows(database.d1, 'user-a')).results).toEqual([
      { dashboard_id: 'daily', config_json: JSON.stringify(userAConfig) },
    ])
    expect((await loadDashboardRows(database.d1, 'user-b')).results).toEqual([
      { dashboard_id: 'daily', config_json: JSON.stringify(userBConfig) },
    ])

    await saveDashboardRows(database.d1, 'user-a', [{ id: 'daily', config: { widgets: [{ id: 'updated-a' }] } }])
    expect((await loadDashboardRows(database.d1, 'user-b')).results).toEqual([
      { dashboard_id: 'daily', config_json: JSON.stringify(userBConfig) },
    ])
  })
})
