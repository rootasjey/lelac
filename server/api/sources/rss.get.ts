import { normalizeFeedUrl } from '../../../shared/utils/feedUrl'
import { fetchPublicFeed } from '../../utils/rssFeed'

export default defineCachedEventHandler(async (event) => {
  const value = getQuery(event).url
  if (typeof value !== 'string') throw createError({ statusCode: 400, statusMessage: 'Adresse de flux invalide' })
  const url = normalizeFeedUrl(value)
  if (!url) throw createError({ statusCode: 400, statusMessage: 'Un flux RSS ou Atom public en HTTPS est requis' })

  try {
    return await fetchPublicFeed(url.href)
  } catch (cause) {
    const status = cause instanceof Error ? cause.message.match(/Feed responded with status (\d+)/)?.[1] : undefined
    const statusMessage = status
      ? `La source a répondu avec HTTP ${status}.`
      : 'La source est indisponible ou sa réponse n’est pas un flux RSS/Atom valide.'
    throw createError({ statusCode: 502, statusMessage })
  }
}, { maxAge: 300, swr: false })
