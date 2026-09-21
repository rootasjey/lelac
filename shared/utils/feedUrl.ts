/** Normalize and constrain a user-supplied feed URL before making a server request. */
export function normalizeFeedUrl(input: string): URL | null {
  if (input.length > 2048) return null
  try {
    const url = new URL(input)
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '')
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null
    if (!hostname.includes('.') || hostname.startsWith('[') || /^\d+(?:\.\d+){0,3}$/.test(hostname)) return null
    if (['.localhost', '.local', '.internal', '.test', '.invalid', '.onion', '.home.arpa'].some(suffix => hostname === suffix.slice(1) || hostname.endsWith(suffix))) return null
    url.hostname = hostname
    return url
  } catch { return null }
}
