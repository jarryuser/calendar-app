import { entities, type Mutation, type RemoteRecord, type SyncRequest, type SyncResponse } from '../../shared/sync'

interface Env { DB: D1Database }
interface Row {
  entity: RemoteRecord['entity']
  id: string
  revision: number
  deleted: number
  payload: string | null
}

function record(row: Row): RemoteRecord {
  return { entity: row.entity, id: row.id, revision: row.revision, deleted: !!row.deleted, data: !row.deleted && row.payload ? JSON.parse(row.payload) : null }
}

function validMutation(value: unknown): value is Mutation {
  if (!value || typeof value !== 'object') return false
  const m = value as Mutation
  if (!entities.includes(m.entity) || typeof m.id !== 'string' || !m.id || m.id.length > 200) return false
  if (typeof m.mutationId !== 'string' || !m.mutationId || m.mutationId.length > 200) return false
  if (!Number.isSafeInteger(m.baseRevision) || m.baseRevision < 0 || typeof m.deleted !== 'boolean') return false
  if (m.deleted) return true
  if (!m.data || m.data.id !== m.id || JSON.stringify(m.data).length > 500_000) return false
  const required = { events: ['title', 'start', 'end', 'calendarId'], calendars: ['name', 'color'], tasks: ['title', 'calendarId'], deletedInstances: ['eventId', 'date'] }
  if (typeof m.data.createdAt !== 'string' || !Number.isFinite(Date.parse(m.data.createdAt))) return false
  if (m.entity !== 'deletedInstances' && (typeof m.data.updatedAt !== 'string' || !Number.isFinite(Date.parse(m.data.updatedAt)))) return false
  if (m.entity === 'events' && (typeof m.data.allDay !== 'boolean' || !Array.isArray(m.data.reminders))) return false
  if (m.entity === 'calendars' && (typeof m.data.isVisible !== 'boolean' || typeof m.data.isDefault !== 'boolean')) return false
  if (m.entity === 'tasks' && typeof m.data.completed !== 'boolean') return false
  if (required[m.entity].some(key => typeof m.data![key] !== 'string')) return false
  if (m.entity === 'events' && (!Number.isFinite(Date.parse(m.data.start as string)) || !Number.isFinite(Date.parse(m.data.end as string)) || Date.parse(m.data.end as string) <= Date.parse(m.data.start as string))) return false
  return true
}

export async function onRequestPost(context: { request: Request; env: Env; data: { userId?: string } }): Promise<Response> {
  const owner = context.data.userId
  if (!owner) return json({ error: 'Unauthorized' }, 401)
  let body: SyncRequest
  try {
    const text = await context.request.text()
    if (text.length > 2_000_000) return json({ error: 'Request too large' }, 413)
    body = JSON.parse(text)
  } catch { return json({ error: 'Invalid JSON' }, 400) }
  if (body?.protocol !== 2) return json({ error: 'Update the application before syncing' }, 409)
  if (!Number.isSafeInteger(body.cursor) || body.cursor < 0 || !Array.isArray(body.mutations) || body.mutations.length > 100 || !body.mutations.every(validMutation)) {
    return json({ error: 'Invalid sync request' }, 400)
  }
  const keys = body.mutations.map(m => `${m.entity}:${m.id}`)
  if (new Set(keys).size !== keys.length) return json({ error: 'Duplicate mutations' }, 400)
  try {
    const db = context.env.DB
    if (body.mutations.length) {
      const statements: D1PreparedStatement[] = []
      for (const m of body.mutations) {
        const payload = m.deleted ? null : JSON.stringify(m.data)
        statements.push(db.prepare(`
          INSERT INTO sync_records(owner, entity, id, revision, deleted, payload, mutationId)
          SELECT ?, ?, ?, 1, ?, ?, ? WHERE (? = 0 OR EXISTS (
            SELECT 1 FROM sync_records WHERE owner = ? AND entity = ? AND id = ? AND revision = ?
          )) AND (? = 1 OR NOT EXISTS (
            SELECT 1 FROM sync_records WHERE owner = ? AND entity = 'calendars'
            AND id = json_extract(?, '$.calendarId') AND deleted = 1
          ))
          ON CONFLICT(owner, entity, id) DO UPDATE SET
            revision = sync_records.revision + 1, deleted = excluded.deleted,
            payload = excluded.payload, mutationId = excluded.mutationId
          WHERE sync_records.revision = ? AND sync_records.mutationId != excluded.mutationId
        `).bind(owner, m.entity, m.id, m.deleted ? 1 : 0, payload, m.mutationId, m.baseRevision,
          owner, m.entity, m.id, m.baseRevision, m.deleted ? 1 : 0, owner, payload, m.baseRevision))
        if (m.deleted && m.entity === 'calendars') {
          statements.push(db.prepare(`UPDATE sync_records SET revision = revision + 1, deleted = 1, mutationId = ?
            WHERE owner = ? AND deleted = 0 AND entity = 'deletedInstances'
            AND json_extract(payload, '$.eventId') IN (SELECT id FROM sync_records WHERE owner = ? AND entity = 'events' AND json_extract(payload, '$.calendarId') = ?)
            AND EXISTS (SELECT 1 FROM sync_records WHERE owner = ? AND entity = 'calendars' AND id = ? AND deleted = 1)
          `).bind(`cascade:${m.mutationId}`, owner, owner, m.id, owner, m.id))
          statements.push(db.prepare(`UPDATE sync_records SET revision = revision + 1, deleted = 1, mutationId = ?
            WHERE owner = ? AND deleted = 0 AND entity IN ('events', 'tasks') AND json_extract(payload, '$.calendarId') = ?
            AND EXISTS (SELECT 1 FROM sync_records WHERE owner = ? AND entity = 'calendars' AND id = ? AND deleted = 1)
          `).bind(`cascade:${m.mutationId}`, owner, m.id, owner, m.id))
        }
        if (m.deleted && m.entity === 'events') {
          statements.push(db.prepare(`UPDATE sync_records SET revision = revision + 1, deleted = 1, mutationId = ?
            WHERE owner = ? AND deleted = 0 AND ((entity = 'events' AND json_extract(payload, '$.recurringEventId') = ?)
              OR (entity = 'deletedInstances' AND json_extract(payload, '$.eventId') = ?))
            AND EXISTS (SELECT 1 FROM sync_records WHERE owner = ? AND entity = 'events' AND id = ? AND deleted = 1)
          `).bind(`cascade:${m.mutationId}`, owner, m.id, m.id, owner, m.id))
        }
      }
      await db.batch(statements)
    }
    const accepted: RemoteRecord[] = []
    const conflicts: SyncResponse['conflicts'] = []
    for (const m of body.mutations) {
      const row = await db.prepare('SELECT * FROM sync_records WHERE owner = ? AND entity = ? AND id = ?').bind(owner, m.entity, m.id).first<Row & { mutationId: string }>()
      if (row && (row.mutationId === m.mutationId || (m.deleted && row.deleted))) accepted.push(record(row))
      else conflicts.push({ mutationId: m.mutationId, remote: row ? record(row) : { entity: m.entity, id: m.id, revision: 0, deleted: true, data: null } })
    }
    const page = await db.prepare('SELECT * FROM sync_log WHERE owner = ? AND seq > ? ORDER BY seq LIMIT 201').bind(owner, body.cursor).all<Row & { seq: number }>()
    const rows = page.results.slice(0, 200)
    return json({ protocol: 2, accepted, conflicts, records: rows.map(record), cursor: rows.at(-1)?.seq ?? body.cursor, hasMore: page.results.length > 200, serverTime: new Date().toISOString() } satisfies SyncResponse)
  } catch (error) {
    console.error('Sync failed:', error)
    return json({ error: 'Sync failed' }, 500)
  }
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}
