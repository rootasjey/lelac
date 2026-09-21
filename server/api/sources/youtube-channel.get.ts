import { youtubeChannelHandleFromInput } from '../../../shared/utils/youtubeFeed'
import { resolveYoutubeChannelId } from '../../utils/youtubeChannel'

export default defineCachedEventHandler(async (event) => {
  const value = getQuery(event).url
  if (typeof value !== 'string' || !youtubeChannelHandleFromInput(value)) {
    throw createError({ statusCode: 400, statusMessage: 'Saisissez une URL de chaîne YouTube au format /@handle.' })
  }

  try {
    return { channelId: await resolveYoutubeChannelId(value) }
  } catch (cause) {
    const status = cause instanceof Error ? cause.message.match(/responded with status (\d+)/)?.[1] : undefined
    const statusMessage = status
      ? `YouTube a répondu avec HTTP ${status} pour cette chaîne.`
      : 'Impossible de résoudre cette chaîne YouTube. Vérifiez que son URL est publique ou saisissez son ID UC….'
    throw createError({ statusCode: 502, statusMessage })
  }
}, { maxAge: 3600, swr: false })
