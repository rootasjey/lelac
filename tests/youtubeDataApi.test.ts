import { describe, expect, it, vi } from 'vitest'
import { fetchYoutubeVideos, resolveYoutubeChannelIdByHandle } from '../server/utils/youtubeDataApi'

const channelId = 'UC_x5XG1OV2P6uZZ5FSM9Ttw'
const uploadsPlaylistId = 'UU_x5XG1OV2P6uZZ5FSM9Ttw'

describe('YouTube Data API feed adapter', () => {
  it('resolves a channel handle through channels.list', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ id: channelId }] }), { status: 200 }))

    await expect(resolveYoutubeChannelIdByHandle('@FilmsActu', 'server-only-key', fetcher)).resolves.toBe(channelId)
    const request = new URL(fetcher.mock.calls[0]![0] as URL)
    expect(request.pathname).toBe('/youtube/v3/channels')
    expect(request.searchParams.get('part')).toBe('id')
    expect(request.searchParams.get('forHandle')).toBe('FilmsActu')
    expect(request.searchParams.has('maxResults')).toBe(false)
    expect(request.searchParams.get('key')).toBe('server-only-key')
  })

  it('loads a channel uploads playlist and maps its videos to feed articles', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [{
          snippet: { title: 'Google for Developers' },
          contentDetails: { relatedPlaylists: { uploads: uploadsPlaylistId } },
        }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [{
          snippet: {
            title: 'Gemini Live API in action',
            channelTitle: 'Google for Developers',
            publishedAt: '2026-09-15T10:00:00Z',
            resourceId: { videoId: 'dQw4w9WgXcQ' },
          },
        }],
      }), { status: 200 }))

    const result = await fetchYoutubeVideos(channelId, 'server-only-key', fetcher)

    expect(result.source).toBe('Google for Developers')
    expect(result.articles).toEqual([{
      title: 'Gemini Live API in action',
      source: 'Google for Developers',
      link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      date: '2026-09-15T10:00:00Z',
    }])
    expect(fetcher).toHaveBeenCalledTimes(2)
    const channelRequest = new URL(fetcher.mock.calls[0]![0] as URL)
    const playlistRequest = new URL(fetcher.mock.calls[1]![0] as URL)
    expect(channelRequest.pathname).toBe('/youtube/v3/channels')
    expect(channelRequest.searchParams.get('id')).toBe(channelId)
    expect(channelRequest.searchParams.get('key')).toBe('server-only-key')
    expect(playlistRequest.pathname).toBe('/youtube/v3/playlistItems')
    expect(playlistRequest.searchParams.get('playlistId')).toBe(uploadsPlaylistId)
    expect(playlistRequest.searchParams.get('maxResults')).toBe('10')
  })

  it('rejects channels without an uploads playlist before requesting videos', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), { status: 200 }))

    await expect(fetchYoutubeVideos(channelId, 'server-only-key', fetcher)).rejects.toThrow('no public uploads playlist')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('reports upstream HTTP failures without exposing API credentials', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('', { status: 403 }))

    let error = ''
    try {
      await fetchYoutubeVideos(channelId, 'server-only-key', fetcher)
    } catch (cause) {
      error = String(cause)
    }

    expect(error).toContain('HTTP 403')
    expect(error).not.toContain('server-only-key')
  })
})
