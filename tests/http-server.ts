import { createServer } from 'node:http'
import { createServerDatabase } from './server-db'
import { onRequest } from '../functions/api/_middleware'
import * as auth from '../functions/api/auth'
import { onRequestPost as sync } from '../functions/api/sync'

let database = createServerDatabase()
const server = createServer(async (incoming, outgoing) => {
  try {
    const chunks: Buffer[] = []
    for await (const chunk of incoming) chunks.push(Buffer.from(chunk))
    const url = `http://127.0.0.1:8788${incoming.url}`
    if (incoming.url === '/api/__test/reset') {
      database.sql.close(); database = createServerDatabase()
      outgoing.end('ok'); return
    }
    const headers = new Headers()
    for (const [key, value] of Object.entries(incoming.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
    const request = new Request(url, { method: incoming.method, headers, ...(!['GET', 'HEAD'].includes(incoming.method || '') ? { body: Buffer.concat(chunks) } : {}) })
    const env = { DB: database.db as never, AUTH_TOKEN: 'test-password', ALLOWED_ORIGINS: 'http://127.0.0.1:5173,http://localhost:5173' }
    const data: { userId?: string } = {}
    const context = { request, env, data, next: async () => {
      if (new URL(url).pathname === '/api/auth') {
        if (request.method === 'POST') return auth.onRequestPost({ request, env })
        if (request.method === 'DELETE') return auth.onRequestDelete({ request })
        return auth.onRequestGet({ request, env })
      }
      return sync({ request, env, data })
    } }
    const response = await onRequest(context)
    outgoing.writeHead(response.status, Object.fromEntries(response.headers))
    outgoing.end(Buffer.from(await response.arrayBuffer()))
  } catch (error) { console.error(error); outgoing.writeHead(500); outgoing.end('test server failed') }
})
server.listen(8788, '127.0.0.1', () => console.log('Test API ready'))
