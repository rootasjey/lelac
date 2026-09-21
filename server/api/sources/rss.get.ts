import { normalizeFeedUrl } from '../../../shared/utils/feedUrl'
import { fetchPublicFeed } from '../../utils/rssFeed'

export default defineCachedEventHandler(async (event) => {
  const value = getQuery(event).url
  if (typeof value !== 'string') throw createError({ statusCode: 400, statusMessage: 'Adresse de flux invalide' })
  const url = normalizeFeedUrl(value)
  if (!url) throw createError({ statusCode: 400, statusMessage: 'Un flux RSS ou Atom public en HTTPS est requis' })

  try {
    return await fetchPublicFeed(url.href)
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Ce flux est indisponible. Vérifiez son adresse ou réessayez.' })
  }
}, { maxAge: 300, swr: false })
