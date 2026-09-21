import type { FeedResult } from '../../shared/utils/feed'

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

interface YoutubeChannelListResponse {
  items?: Array<{
    snippet?: { title?: string }
    contentDetails?: { relatedPlaylists?: { uploads?: string } }
  }>
}

interface YoutubePlaylistItemsResponse {
  items?: Array<{
    snippet?: {
      title?: string
      channelTitle?: string
      publishedAt?: string
      resourceId?: { videoId?: string }
    }
    contentDetails?: { videoId?: string; videoPublishedAt?: string }
  }>
}

type YoutubeFetch = (input: URL, init?: RequestInit) => Promise<Response>

async function youtubeApiGet<T>(resource: string, parameters: Record<string, string>, apiKey: string, fetcher: YoutubeFetch): Promise<T> {
  const url = new URL(`${YOUTUBE_API_BASE}/${resource}`)
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value)
  url.searchParams.set('key', apiKey)

  const response = await fetcher(url, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`YouTube Data API returned HTTP ${response.status}`)
  return await response.json() as T
}

export async function fetchYoutubeVideos(channelId: string, apiKey: string, fetcher: YoutubeFetch = fetch): Promise<FeedResult> {
  const channels = await youtubeApiGet<YoutubeChannelListResponse>('channels', {
    part: 'snippet,contentDetails',
    id: channelId,
    maxResults: '1',
  }, apiKey, fetcher)
  const channel = channels.items?.[0]
  const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads
  if (!uploadsPlaylistId) throw new Error('YouTube channel has no public uploads playlist')

  const playlist = await youtubeApiGet<YoutubePlaylistItemsResponse>('playlistItems', {
    part: 'snippet,contentDetails',
    playlistId: uploadsPlaylistId,
    maxResults: '10',
  }, apiKey, fetcher)

  const source = channel.snippet?.title?.trim() || 'YouTube'
  const articles = (playlist.items ?? []).flatMap((item) => {
    const videoId = item.snippet?.resourceId?.videoId ?? item.contentDetails?.videoId
    const title = item.snippet?.title?.trim()
    if (!videoId || !VIDEO_ID_PATTERN.test(videoId) || !title) return []

    return [{
      title,
      source: item.snippet?.channelTitle?.trim() || source,
      link: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
      date: item.snippet?.publishedAt ?? item.contentDetails?.videoPublishedAt ?? '',
    }]
  })

  return { articles, source, fetchedAt: new Date().toISOString() }
}
