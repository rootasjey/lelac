import { describe, expect, it } from 'vitest'
import { resolveBoardSourceValue } from '../shared/utils/sourceState'

describe('source response selection', () => {
  it('uses the last successful value when a refresh has no new response', () => {
    const previous = { key: 'rss:https://example.org/feed.xml', payload: ['last good article'] }
    expect(resolveBoardSourceValue(previous.key, undefined, previous)).toEqual(['last good article'])
  })

  it('never shows a response from a different active source', () => {
    const previous = { key: 'rss:https://example.org/old.xml', payload: ['old article'] }
    expect(resolveBoardSourceValue('rss:https://example.org/new.xml', undefined, previous)).toBeUndefined()
  })

  it('prefers the newest response for the active source', () => {
    const previous = { key: 'weather:paris', payload: { temperature: 17 } }
    const current = { key: 'weather:paris', payload: { temperature: 18 } }
    expect(resolveBoardSourceValue('weather:paris', current, previous)).toEqual({ temperature: 18 })
  })
})
