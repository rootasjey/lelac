export default defineCachedEventHandler(async (event) => {
  const q = getQuery(event).q
  if (typeof q !== 'string' || q.trim().length < 2 || q.length > 100) throw createError({ statusCode: 400, statusMessage: 'Saisissez au moins deux caracteres' })
  try {
    const data = await $fetch<{ results?: Array<{ id: number; name: string; country?: string; admin1?: string; latitude: number; longitude: number }> }>('https://geocoding-api.open-meteo.com/v1/search', { query: { name: q.trim(), count: 5, language: 'fr', format: 'json' }, timeout: 10000, retry: 0 })
    return (data.results ?? []).map(r => ({ id: r.id, name: [r.name, r.admin1, r.country].filter(Boolean).join(', '), lat: r.latitude, lon: r.longitude }))
  } catch { throw createError({ statusCode: 502, statusMessage: 'Recherche indisponible' }) }
}, { maxAge: 3600, swr: false })
