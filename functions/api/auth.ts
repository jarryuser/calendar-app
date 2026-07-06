interface Env {
  DB: D1Database
  AUTH_TOKEN: string
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const body = (await context.request.json()) as { password?: string }

    if (!body.password || !context.env.AUTH_TOKEN) {
      return json({ error: 'Invalid request' }, 400)
    }

    if (body.password !== context.env.AUTH_TOKEN) {
      return json({ error: 'Invalid password' }, 401)
    }

    return json({ token: context.env.AUTH_TOKEN })
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
