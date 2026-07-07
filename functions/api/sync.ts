interface Env {
  DB: D1Database
  AUTH_TOKEN: string
}

interface SyncChanges {
  events?: Record<string, unknown>[]
  eventDeletions?: string[]
  calendars?: Record<string, unknown>[]
  calendarDeletions?: string[]
  tasks?: Record<string, unknown>[]
  taskDeletions?: string[]
  deletedInstances?: Record<string, unknown>[]
  deletedInstanceDeletions?: string[]
}

interface SyncRequest {
  lastSyncAt?: string
  changes: SyncChanges
}

interface SyncResponse {
  events: { upserted: Record<string, unknown>[]; deleted: string[] }
  calendars: { upserted: Record<string, unknown>[]; deleted: string[] }
  tasks: { upserted: Record<string, unknown>[]; deleted: string[] }
  deletedInstances: { upserted: Record<string, unknown>[]; deleted: string[] }
  serverTime: string
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const body = (await context.request.json()) as SyncRequest
    const db = context.env.DB
    const serverTime = new Date().toISOString()
    const since = body.lastSyncAt || '1970-01-01T00:00:00.000Z'

    await processEventsPush(db, body.changes)
    await processCalendarsPush(db, body.changes)
    await processTasksPush(db, body.changes)
    await processDeletedInstancesPush(db, body.changes)

    const response: SyncResponse = {
      events: await pullEvents(db, since),
      calendars: await pullCalendars(db, since),
      tasks: await pullTasks(db, since),
      deletedInstances: await pullDeletedInstances(db, since),
      serverTime,
    }

    return json(response)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return json({ error: message }, 500)
  }
}

async function processEventsPush(db: D1Database, changes: SyncChanges): Promise<void> {
  if (changes.events?.length) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO events (
        id, uid, title, start, end, allDay, description, location,
        color, calendarId, reminders, recurrence, recurringEventId,
        exceptionDate, isException, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const evt of changes.events) {
      await stmt.bind(
        evt.id, evt.uid || null, evt.title || '', evt.start, evt.end,
        evt.allDay ? 1 : 0, evt.description || '', evt.location || '',
        evt.color || 'blue', evt.calendarId,
        JSON.stringify(evt.reminders || []),
        evt.recurrence ? JSON.stringify(evt.recurrence) : null,
        evt.recurringEventId || null, evt.exceptionDate || null,
        evt.isException ? 1 : 0, evt.createdAt, evt.updatedAt
      ).run()
    }
  }

  if (changes.eventDeletions?.length) {
    const now = new Date().toISOString()
    const stmt = db.prepare(`UPDATE events SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`)
    for (const id of changes.eventDeletions) {
      await stmt.bind(now, id).run()
    }
  }
}

async function processCalendarsPush(db: D1Database, changes: SyncChanges): Promise<void> {
  if (changes.calendars?.length) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO calendars (
        id, name, color, isVisible, isDefault, description,
        subscriptionUrl, lastRefreshed, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const cal of changes.calendars) {
      await stmt.bind(
        cal.id, cal.name, cal.color || 'blue',
        cal.isVisible ? 1 : 0, cal.isDefault ? 1 : 0,
        cal.description || '', cal.subscriptionUrl || null,
        cal.lastRefreshed || null, cal.createdAt, cal.updatedAt
      ).run()
    }
  }

  if (changes.calendarDeletions?.length) {
    const now = new Date().toISOString()
    const stmt = db.prepare(`UPDATE calendars SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`)
    for (const id of changes.calendarDeletions) {
      await stmt.bind(now, id).run()
    }
  }
}

async function processTasksPush(db: D1Database, changes: SyncChanges): Promise<void> {
  if (changes.tasks?.length) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO tasks (
        id, title, notes, dueDate, completed, completedAt,
        calendarId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const task of changes.tasks) {
      await stmt.bind(
        task.id, task.title, task.notes || '', task.dueDate || null,
        task.completed ? 1 : 0, task.completedAt || null,
        task.calendarId, task.createdAt, task.updatedAt
      ).run()
    }
  }

  if (changes.taskDeletions?.length) {
    const now = new Date().toISOString()
    const stmt = db.prepare(`UPDATE tasks SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`)
    for (const id of changes.taskDeletions) {
      await stmt.bind(now, id).run()
    }
  }
}

async function processDeletedInstancesPush(db: D1Database, changes: SyncChanges): Promise<void> {
  if (changes.deletedInstances?.length) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO deleted_instances (id, eventId, date, createdAt)
      VALUES (?, ?, ?, ?)
    `)
    for (const di of changes.deletedInstances) {
      await stmt.bind(di.id, di.eventId, di.date, di.createdAt).run()
    }
  }

  if (changes.deletedInstanceDeletions?.length) {
    const now = new Date().toISOString()
    const stmt = db.prepare(`UPDATE deleted_instances SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`)
    for (const id of changes.deletedInstanceDeletions) {
      await stmt.bind(now, id).run()
    }
  }
}

function rowToEvent(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    allDay: row.allDay === 1 || row.allDay === true,
    isException: row.isException === 1 || row.isException === true,
    reminders: typeof row.reminders === 'string' ? JSON.parse(row.reminders as string) : (row.reminders || []),
    recurrence: row.recurrence ? (typeof row.recurrence === 'string' ? JSON.parse(row.recurrence as string) : row.recurrence) : undefined,
  }
}

function rowToCalendar(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    isVisible: row.isVisible === 1 || row.isVisible === true,
    isDefault: row.isDefault === 1 || row.isDefault === true,
  }
}

function rowToTask(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    completed: row.completed === 1 || row.completed === true,
  }
}

async function pullEvents(db: D1Database, since: string): Promise<{ upserted: Record<string, unknown>[]; deleted: string[] }> {
  const upserted = await db.prepare(
    `SELECT * FROM events WHERE updatedAt > ? AND deleted_at IS NULL ORDER BY updatedAt ASC`
  ).bind(since).all()

  const deletedRows = await db.prepare(
    `SELECT id FROM events WHERE deleted_at > ? ORDER BY deleted_at ASC`
  ).bind(since).all()

  return {
    upserted: (upserted.results || []).map(rowToEvent),
    deleted: (deletedRows.results || []).map(r => r.id as string),
  }
}

// Calendars are a small dataset; always return all active calendars so
// device calendars resolve on other devices regardless of updatedAt age.
async function pullCalendars(db: D1Database, _since: string): Promise<{ upserted: Record<string, unknown>[]; deleted: string[] }> {
  const [upserted, deletedRows] = await Promise.all([
    db.prepare(
      `SELECT * FROM calendars WHERE deleted_at IS NULL ORDER BY createdAt ASC`
    ).all(),
    db.prepare(
      `SELECT id FROM calendars WHERE deleted_at IS NOT NULL ORDER BY deleted_at ASC`
    ).all(),
  ])

  return {
    upserted: (upserted.results || []).map(rowToCalendar),
    deleted: (deletedRows.results || []).map(r => r.id as string),
  }
}

async function pullTasks(db: D1Database, since: string): Promise<{ upserted: Record<string, unknown>[]; deleted: string[] }> {
  const upserted = await db.prepare(
    `SELECT * FROM tasks WHERE updatedAt > ? AND deleted_at IS NULL ORDER BY updatedAt ASC`
  ).bind(since).all()

  const deletedRows = await db.prepare(
    `SELECT id FROM tasks WHERE deleted_at > ? ORDER BY deleted_at ASC`
  ).bind(since).all()

  return {
    upserted: (upserted.results || []).map(rowToTask),
    deleted: (deletedRows.results || []).map(r => r.id as string),
  }
}

async function pullDeletedInstances(db: D1Database, since: string): Promise<{ upserted: Record<string, unknown>[]; deleted: string[] }> {
  const upserted = await db.prepare(
    `SELECT * FROM deleted_instances WHERE createdAt > ? AND deleted_at IS NULL ORDER BY createdAt ASC`
  ).bind(since).all()

  const deletedRows = await db.prepare(
    `SELECT id FROM deleted_instances WHERE deleted_at > ? ORDER BY deleted_at ASC`
  ).bind(since).all()

  return {
    upserted: upserted.results || [],
    deleted: (deletedRows.results || []).map(r => r.id as string),
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
