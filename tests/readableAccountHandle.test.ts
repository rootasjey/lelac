// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { generateReadableAccountHandle, isReadableAccountHandleUniqueConflict } from '../server/utils/readableAccountHandle'

describe('generated account handles', () => {
  it('creates readable lowercase slugs with an unambiguous random suffix', () => {
    const handle = generateReadableAccountHandle()
    expect(handle).toMatch(/^[a-z]+-[a-z]+-[abcdefghjkmnpqrstuvwxyz23456789]{4}$/)
    expect(handle.length).toBeLessThanOrEqual(36)
  })

  it('only retries account-handle uniqueness conflicts', () => {
    expect(isReadableAccountHandleUniqueConflict(new Error('UNIQUE constraint failed: users.handle'))).toBe(true)
    expect(isReadableAccountHandleUniqueConflict(new Error('UNIQUE constraint failed: users.email'))).toBe(false)
    expect(isReadableAccountHandleUniqueConflict('UNIQUE constraint failed: users.handle')).toBe(false)
  })
})
