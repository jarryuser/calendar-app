import { createSession, matchesPassword, readSession, sessionCookie, verifyPassword, type AuthEnv } from '../../server/session'

export async function onRequestPost(context: { request: Request; env: AuthEnv }) {
  const { request, env } = context
  try {
    const body = await request.json() as { username?: string; password?: string }
    const username = body?.username || 'personal'
    if (typeof body?.password !== 'string' || body.password.length > 1000 || typeof username !== 'string' || username.length > 100) return Response.json({ error: 'Invalid request' }, { status: 400 })
    if (!env.AUTH_TOKEN) return Response.json({ error: 'Server not configured' }, { status: 503 })
    const ip = request.headers.get('CF-Connecting-IP') || 'local'
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.AUTH_TOKEN}:${ip}:${username}`))
    const key = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('')
    const now = Date.now()
    await env.DB.prepare('DELETE FROM auth_attempts WHERE resetAt < ?').bind(now - 15 * 60_000).run()
    const attempt = await env.DB.prepare(`INSERT INTO auth_attempts(key, attempts, resetAt) VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET attempts = CASE WHEN resetAt < ? THEN 1 ELSE attempts + 1 END,
      resetAt = CASE WHEN resetAt < ? THEN excluded.resetAt ELSE resetAt END
      RETURNING attempts`).bind(key, now + 15 * 60_000, now, now).first<{ attempts: number }>()
    if (!attempt || attempt.attempts > 10) return Response.json({ error: 'Too many attempts' }, { status: 429, headers: { 'Retry-After': '900' } })
    let valid = false
    if (env.AUTH_USERS) {
      const users = JSON.parse(env.AUTH_USERS) as Record<string, { salt: string; hash: string }>
      const credentials = Object.hasOwn(users, username) ? users[username] : null
      // Run the same derivation for unknown users to avoid a timing oracle.
      valid = await verifyPassword(body.password, credentials || { salt: 'AAAAAAAAAAAAAAAAAAAAAA', hash: '' }) && !!credentials
    } else valid = username === 'personal' && await matchesPassword(body.password, env.AUTH_TOKEN)
    if (!valid) return Response.json({ error: 'Invalid credentials' }, { status: 401 })
    const session = await createSession(username, env.AUTH_TOKEN)
    return Response.json(session, { headers: { 'Cache-Control': 'no-store', 'Set-Cookie': sessionCookie(session.token, new URL(request.url).protocol === 'https:') } })
  } catch { return Response.json({ error: 'Invalid request' }, { status: 400 }) }
}

export async function onRequestGet(context: { request: Request; env: AuthEnv }) {
  const session = await readSession(context.request, context.env)
  return Response.json(session || { error: 'Unauthorized' }, { status: session ? 200 : 401, headers: { 'Cache-Control': 'no-store' } })
}

export function onRequestDelete(context: { request: Request }) {
  return new Response(null, { status: 204, headers: { 'Set-Cookie': sessionCookie('', new URL(context.request.url).protocol === 'https:', 0) } })
}
