import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveYoutubeChannelId, youtubeChannelIdFromHtml } from '../server/utils/youtubeChannel'

const channelId = 'UC_x5XG1OV2P6uZZ5FSM9Ttw'
const fetchMock = vi.fn<typeof fetch>()

describe('YouTube channel handle resolver', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('extracts the stable channel ID from channel metadata and canonical URLs', () => {
    expect(youtubeChannelIdFromHtml(`<meta content="${channelId}" itemprop="channelId">`)).toBe(channelId)
    expect(youtubeChannelIdFromHtml(`<link rel="canonical" href="https://www.youtube.com/channel/${channelId}">`)).toBe(channelId)
    expect(youtubeChannelIdFromHtml('<html><title>Channel</title></html>')).toBeNull()
  })

  it('resolves a handle page and fetches only its canonical YouTube URL', async () => {
    fetchMock.mockResolvedValueOnce(new Response(`<meta itemprop="channelId" content="${channelId}">`, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }))

    await expect(resolveYoutubeChannelId('https://www.youtube.com/@LesRevuesduMonde')).resolves.toBe(channelId)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0]?.[0]).toBeInstanceOf(URL)
    expect((fetchMock.mock.calls[0]?.[0] as URL).href).toBe('https://www.youtube.com/@LesRevuesduMonde')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ redirect: 'manual' })
  })

  it('falls back to the HTML resolver when the Data API has no matching handle', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(`<meta itemprop="channelId" content="${channelId}">`, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }))

    await expect(resolveYoutubeChannelId('https://www.youtube.com/@FilmsActu', 'server-only-key')).resolves.toBe(channelId)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(new URL(fetchMock.mock.calls[0]![0] as URL).searchParams.get('forHandle')).toBe('FilmsActu')
    expect((fetchMock.mock.calls[1]?.[0] as URL).href).toBe('https://www.youtube.com/@FilmsActu')
  })

  it('rejects a malformed handle without making a network request', async () => {
    await expect(resolveYoutubeChannelId('https://youtube.com.evil.example/@channel')).rejects.toThrow('Invalid YouTube channel handle')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('blocks redirects outside YouTube', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://example.org/channel' } }))

    await expect(resolveYoutubeChannelId('https://youtube.com/@LesRevuesduMonde')).rejects.toThrow('redirected outside YouTube')
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
