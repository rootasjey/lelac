import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPublicFeed } from '../server/utils/rssFeed'

const atomFeed = `<feed xmlns="http://www.w3.org/2005/Atom"><title>Example</title><entry><title>Story</title><link href="https://example.org/story"/><updated>2026-09-21T01:02:00Z</updated></entry></feed>`
const fetchMock = vi.fn<typeof fetch>()

describe('RSS upstream requests', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('follows a bounded public HTTPS redirect manually and parses the feed', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: '/feed.atom' } }))
      .mockResolvedValueOnce(new Response(atomFeed, { headers: { 'content-type': 'application/atom+xml; charset=utf-8' } }))

    const result = await fetchPublicFeed('https://example.org/start')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ redirect: 'manual' })
    expect(result.articles[0]?.title).toBe('Story')
  })

  it('does not follow a redirect to a non-public destination', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private' } }))

    await expect(fetchPublicFeed('https://example.org/start')).rejects.toThrow('not public HTTPS')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects oversized bodies before parsing', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<feed/>', { headers: { 'content-length': String(2 * 1024 * 1024 + 1) } }))

    await expect(fetchPublicFeed('https://example.org/feed.atom')).rejects.toThrow('size limit')
  })

  it('never issues a request for a local or private URL', async () => {
    await expect(fetchPublicFeed('https://localhost/feed.atom')).rejects.toThrow('Invalid or non-public')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
