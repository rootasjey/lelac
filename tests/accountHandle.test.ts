// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { accountDashboardPath, accountHomePath, normalizeAccountHandle } from '../shared/utils/accountHandle'

describe('account handles and routes', () => {
  it('normalizes readable ASCII handles and rejects unsafe or ambiguous values', () => {
    expect(normalizeAccountHandle('  Corpinot-42 ')).toBe('corpinot-42')
    expect(normalizeAccountHandle('ab')).toBeNull()
    expect(normalizeAccountHandle('-corpinot')).toBeNull()
    expect(normalizeAccountHandle('corpinot/board')).toBeNull()
    expect(normalizeAccountHandle('très-bien')).toBeNull()
  })

  it('builds stable account URLs and omits the board segment for the home board', () => {
    expect(accountHomePath('corpinot')).toBe('/@corpinot')
    expect(accountDashboardPath('corpinot', 'daily', 'daily')).toBe('/@corpinot')
    expect(accountDashboardPath('corpinot', 'cinema', 'daily')).toBe('/@corpinot/board/cinema')
  })
})
