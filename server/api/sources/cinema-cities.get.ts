import type { CinemaLocationOption } from '../../../shared/utils/cinema'

interface CommuneFeature {
  properties?: {
    nom?: string
    code?: string
    codeDepartement?: string
    population?: number
  }
  geometry?: { coordinates?: unknown }
}

export default defineCachedEventHandler(async (event): Promise<CinemaLocationOption[]> => {
  const rawQuery = getQuery(event).q
  if (typeof rawQuery !== 'string' || rawQuery.trim().length < 2 || rawQuery.length > 80) {
    throw createError({ statusCode: 400, statusMessage: 'Saisissez au moins deux caractères.' })
  }

  const query = rawQuery.trim()
  const params = new URLSearchParams({
    nom: query,
    fields: 'nom,code,codeDepartement,population',
    boost: 'population',
    limit: '8',
    format: 'geojson',
    geometry: 'centre',
  })

  try {
    const payload = await $fetch<{ features?: CommuneFeature[] }>(`https://geo.api.gouv.fr/communes?${params}`, {
      timeout: 8000,
      retry: 0,
    })

    return (payload.features ?? []).flatMap((feature) => {
      const commune = feature.properties
      const coordinates = feature.geometry?.coordinates
      const lon = Array.isArray(coordinates) ? Number(coordinates[0]) : NaN
      const lat = Array.isArray(coordinates) ? Number(coordinates[1]) : NaN
      if (!commune?.nom || !commune.code || !commune.codeDepartement || !Number.isFinite(lat) || !Number.isFinite(lon)) return []
      return [{
        inseeCode: commune.code,
        name: commune.nom,
        department: commune.codeDepartement,
        lat,
        lon,
        population: Number.isFinite(commune.population) ? Number(commune.population) : 0,
      }]
    })
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Recherche de commune indisponible. Réessayez.' })
  }
}, {
  maxAge: 86_400,
  swr: true,
  getKey: event => {
    const query = getQuery(event).q
    return `cinema-communes-v1:${typeof query === 'string' ? query.trim().toLocaleLowerCase('fr-FR') : ''}`
  },
})
