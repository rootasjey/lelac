const SHARE_PASSWORD_MIN_BYTES = 12
const SHARE_PASSWORD_MAX_BYTES = 128
const SHARE_PASSWORD_ITERATIONS = 600_000
const SHARE_ACCESS_LIFETIME_MS = 12 * 60 * 60 * 1000
const SHARE_ACCESS_COOKIE = 'lelac_share_access'

export function validateSharePassword(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const length = new TextEncoder().encode(value).byteLength
  return length >= SHARE_PASSWORD_MIN_BYTES && length <= SHARE_PASSWORD_MAX_BYTES
}

function toHex(bytes: Uint8Array) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function fromHex(value: string) {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) return null
  return Uint8Array.from(value.match(/.{2}/g)!, byte => Number.parseInt(byte, 16))
}

export async function hashSharePassword(password: string, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: SHARE_PASSWORD_ITERATIONS }, key, 256)
  return { salt: toHex(salt), hash: toHex(new Uint8Array(bits)) }
}

export async function verifySharePassword(password: string, saltHex: string, expectedHashHex: string) {
  const salt = fromHex(saltHex)
  const expected = fromHex(expectedHashHex)
  if (!salt || salt.byteLength !== 16 || !expected || expected.byteLength !== 32) return false
  const actual = fromHex((await hashSharePassword(password, salt)).hash)!
  let difference = 0
  for (let index = 0; index < expected.length; index++) difference |= expected[index]! ^ actual[index]!
  return difference === 0
}

export function shareAccessCookieName() {
  return SHARE_ACCESS_COOKIE
}

export function shareAccessCookiePath(token: string) {
  return `/api/public/boards/${token}`
}

export function shareAccessExpiresAt(shareExpiresAt: string | null, now = Date.now()) {
  const sessionExpiry = now + SHARE_ACCESS_LIFETIME_MS
  return new Date(shareExpiresAt ? Math.min(sessionExpiry, Date.parse(shareExpiresAt)) : sessionExpiry).toISOString()
}
