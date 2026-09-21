export interface WorldClockOption {
  name: string
  country: string
  timezone: string
  search: string
}

const cities = [
  ['Paris', 'France', 'Europe/Paris'],
  ['Londres', 'Royaume-Uni', 'Europe/London'],
  ['Berlin', 'Allemagne', 'Europe/Berlin'],
  ['Madrid', 'Espagne', 'Europe/Madrid'],
  ['Rome', 'Italie', 'Europe/Rome'],
  ['Athènes', 'Grèce', 'Europe/Athens'],
  ['Moscou', 'Russie', 'Europe/Moscow'],
  ['Dubaï', 'Émirats arabes unis', 'Asia/Dubai'],
  ['Mumbai', 'Inde', 'Asia/Kolkata'],
  ['Bangkok', 'Thaïlande', 'Asia/Bangkok'],
  ['Singapour', 'Singapour', 'Asia/Singapore'],
  ['Tokyo', 'Japon', 'Asia/Tokyo'],
  ['Séoul', 'Corée du Sud', 'Asia/Seoul'],
  ['Pékin', 'Chine', 'Asia/Shanghai'],
  ['Sydney', 'Australie', 'Australia/Sydney'],
  ['Auckland', 'Nouvelle-Zélande', 'Pacific/Auckland'],
  ['Le Caire', 'Égypte', 'Africa/Cairo'],
  ['Johannesburg', 'Afrique du Sud', 'Africa/Johannesburg'],
  ['Nairobi', 'Kenya', 'Africa/Nairobi'],
  ['New York', 'États-Unis', 'America/New_York'],
  ['Chicago', 'États-Unis', 'America/Chicago'],
  ['Denver', 'États-Unis', 'America/Denver'],
  ['Los Angeles', 'États-Unis', 'America/Los_Angeles'],
  ['Toronto', 'Canada', 'America/Toronto'],
  ['Vancouver', 'Canada', 'America/Vancouver'],
  ['Mexico', 'Mexique', 'America/Mexico_City'],
  ['São Paulo', 'Brésil', 'America/Sao_Paulo'],
  ['Buenos Aires', 'Argentine', 'America/Argentina/Buenos_Aires'],
  ['Honolulu', 'États-Unis', 'Pacific/Honolulu'],
] as const

export const worldClockOptions: WorldClockOption[] = cities.map(([name, country, timezone]) => ({
  name,
  country,
  timezone,
  search: `${name} ${country} ${timezone}`,
}))
