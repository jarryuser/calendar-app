export interface AuthEnv {
  DB: D1Database
  AUTH_TOKEN: string
  AUTH_USERS?: string
  ALLOWED_ORIGINS?: string
}

const encoder = new TextEncoder()
const encode = (value: Uint8Array) => btoa(String.fromCharCode(...value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const decode = (value: string) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))

async function signingKey(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export async function createSession(userId: string, secret: string, expiresAt = Date.now() + 8 * 60 * 60 * 1000) {
  const payload = encode(encoder.encode(JSON.stringify({ userId, expiresAt })))
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(payload))
  return { token: `${payload}.${encode(new Uint8Array(signature))}`, expiresAt, userId }
}

export async function readSession(request: Request, env: AuthEnv) {
  if (!env.AUTH_TOKEN) return null
  const bearer = request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1]
  const cookie = request.headers.get('Cookie')?.match(/(?:^|;\s*)calendar_session=([^;]+)/)?.[1]
  const token = bearer || cookie
  if (!token) return null
  try {
    const [payload, signature, extra] = token.split('.')
    if (!signature || extra) return null
    if (!await crypto.subtle.verify('HMAC', await signingKey(env.AUTH_TOKEN), decode(signature), encoder.encode(payload))) return null
    const data = JSON.parse(new TextDecoder().decode(decode(payload)))
    if (typeof data.userId !== 'string' || !Number.isSafeInteger(data.expiresAt) || data.expiresAt <= Date.now()) return null
    const users = env.AUTH_USERS ? JSON.parse(env.AUTH_USERS) : { personal: true }
    return Object.hasOwn(users, data.userId) ? data as { userId: string; expiresAt: number } : null
  } catch { return null }
}

export async function matchesPassword(password: string, expected: string) {
  const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))
  const [a, b] = await Promise.all([digest(password), digest(expected)])
  return a.reduce((difference, byte, index) => difference | (byte ^ b[index]), 0) === 0
}

export async function verifyPassword(password: string, credentials: { salt: string; hash: string }) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', iterations: 100_000, salt: decode(credentials.salt) }, key, 256)
  return matchesPassword(encode(new Uint8Array(hash)), credentials.hash)
}

export function sessionCookie(token: string, secure: boolean, maxAge = 8 * 60 * 60) {
  return `calendar_session=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${maxAge}${secure ? '; Secure' : ''}`
}
