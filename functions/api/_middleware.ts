export async function onRequest(context: EventContext<Env, string, Record<string, unknown>>) {
  const url = new URL(context.request.url)

  if (url.pathname === '/api/auth') {
    return context.next()
  }

  if (!url.pathname.startsWith('/api/')) {
    return context.next()
  }

  if (context.request.method === 'OPTIONS') {
    return handleCORS()
  }

  const authHeader = context.request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.slice(7)
  if (!context.env.AUTH_TOKEN || token !== context.env.AUTH_TOKEN) {
    return json({ error: 'Forbidden' }, 403)
  }

  const response = await context.next()
  return addCORS(response)
}

interface Env {
  DB: D1Database
  AUTH_TOKEN: string
}

interface EventContext<T, U, V> {
  request: Request
  env: T
  params: U
  data: V
  next: (request?: Request) => Promise<Response>
  waitUntil: (promise: Promise<void>) => void
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function handleCORS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

function addCORS(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
