import { normalizeYoutubeChannelId } from '../../../shared/utils/youtubeFeed'
import { fetchYoutubeVideos } from '../../utils/youtubeDataApi'

export default defineCachedEventHandler(async (event) => {
  const value = getQuery(event).channelId
  const channelId = typeof value === 'string' ? normalizeYoutubeChannelId(value) : null
  if (!channelId) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant de chaîne YouTube invalide.' })
  }

  const apiKey = useRuntimeConfig(event).youtubeApiKey
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    throw createError({ statusCode: 503, statusMessage: 'Définissez NUXT_YOUTUBE_API_KEY côté serveur pour activer ce widget.' })
  }

  try {
    return await fetchYoutubeVideos(channelId, apiKey.trim())
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : 'La requête a échoué.'
    throw createError({ statusCode: 502, statusMessage: `Impossible de récupérer les vidéos YouTube. ${detail}` })
  }
}, { maxAge: 900, swr: false })
