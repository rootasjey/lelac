export default defineCachedEventHandler(async (event) => {
  const q = getQuery(event)
  const lat = typeof q.lat === 'string' && q.lat.trim() ? Number(q.lat) : NaN
  const lon = typeof q.lon === 'string' && q.lon.trim() ? Number(q.lon) : NaN
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw createError({ statusCode: 400, statusMessage: 'Coordonnees invalides' })
  try {
    const data = await $fetch<{ current: { temperature_2m: number; apparent_temperature: number; weather_code: number }; daily: { temperature_2m_min: number[]; temperature_2m_max: number[] } }>('https://api.open-meteo.com/v1/forecast', { query: { latitude: lat, longitude: lon, current: 'temperature_2m,apparent_temperature,weather_code', daily: 'temperature_2m_min,temperature_2m_max', forecast_days: 1, timezone: 'auto' }, timeout: 10000, retry: 0 })
    const { temperature_2m: temperature, apparent_temperature: feelsLike, weather_code: code } = data.current
    const min = data.daily.temperature_2m_min[0], max = data.daily.temperature_2m_max[0]
    if (![temperature, feelsLike, code, min, max].every(Number.isFinite)) throw new Error('Invalid weather')
    return { temperature: Math.round(temperature), feelsLike: Math.round(feelsLike), code, min: Math.round(min!), max: Math.round(max!), fetchedAt: new Date().toISOString() }
  } catch { throw createError({ statusCode: 502, statusMessage: 'Meteo indisponible. Reessayez dans un instant.' }) }
}, { maxAge: 600, swr: false })
