import { readSession, type AuthEnv } from '../../server/session'

export async function onRequest(context: { request: Request; env: AuthEnv; data: { userId?: string }; next: () => Promise<Response> }) {
  const { request, env } = context
  const url = new URL(request.url)
  const origin = request.headers.get('Origin')
  const allowed = new Set([url.origin, 'tauri://localhost', 'http://tauri.localhost', 'https://tauri.localhost', ...(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)])
  if (origin && !allowed.has(origin)) return Response.json({ error: 'Origin not allowed' }, { status: 403 })
  const cors = (response: Response) => {
    const headers = new Headers(response.headers)
    if (origin) {
      headers.set('Access-Control-Allow-Origin', origin)
      headers.set('Access-Control-Allow-Credentials', 'true')
      headers.set('Vary', 'Origin')
    }
    headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    headers.set('Cache-Control', 'no-store')
    headers.set('X-Content-Type-Options', 'nosniff')
    return new Response(response.body, { status: response.status, headers })
  }
  if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }))
  if (url.pathname === '/api/auth') return cors(await context.next())
  const session = await readSession(request, env)
  if (!session) return cors(Response.json({ error: 'Unauthorized' }, { status: 401 }))
  context.data.userId = session.userId
  return cors(await context.next())
}
