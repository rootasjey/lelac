import { normalizeFeed } from '../../../shared/utils/feed'
export default defineCachedEventHandler(async (event) => {
  const value = getQuery(event).url
  if (typeof value !== 'string' || value.length > 2048) throw createError({ statusCode: 400, statusMessage: 'Adresse de flux invalide' })
  let url: URL
  try { url = new URL(value) } catch { throw createError({ statusCode: 400, statusMessage: 'Adresse de flux invalide' }) }
  if (url.protocol !== 'https:' || url.username || url.password) throw createError({ statusCode: 400, statusMessage: 'Un flux HTTPS public est requis' })
  try {
    // Fixed upstream: never fetch a user-provided address from this server.
    const data = await $fetch<{ status: string; feed?: { title?: string }; items?: Array<{ title?: string; link?: string; pubDate?: string }> }>('https://api.rss2json.com/v1/api.json', { query: { rss_url: url.href }, timeout: 12000, retry: 0 })
    if (data.status !== 'ok' || !Array.isArray(data.items)) throw new Error('Invalid feed')
    return normalizeFeed(data, url.href)
  } catch { throw createError({ statusCode: 502, statusMessage: 'Ce flux est indisponible. Verifiez son adresse ou reessayez.' }) }
}, { maxAge: 300, swr: false })
