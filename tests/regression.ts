import './setup'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { db, openProfile } from '@/db'
import { collectChanges, applyPull, syncOnce } from '@/sync/engine'
import { setAuthToken, hasAuthToken } from '@/sync/client'
import { trackDeletion } from '@/data/deletions'
import { resolveConflict } from '@/data/conflicts'
import { createBackup, restoreBackup, parseBackup } from '@/data/backup'
import { saveICS } from '@/data/import'
import { useEventStore } from '@/store/eventStore'
import { useCalendarStore } from '@/store/calendarStore'
import { useUIStore } from '@/store/uiStore'
import { expandRecurringEvents } from '@/utils/recurrence'
import { importICS, exportICS } from '@/utils/ical'
import { instancesByDay, segmentMinutes } from '@/utils/intervals'
import { dayBounds, dayAtMinute, dayKeyInTz, toDatetimeLocalTz, fromDatetimeLocalTz } from '@/utils/timezone'
import { onRequestPost } from '../functions/api/sync'
import { onRequestPost as authenticate } from '../functions/api/auth'
import { onRequest } from '../functions/api/_middleware'
import { createSession, readSession } from '../server/session'
import type { Mutation, SyncResponse } from '../shared/sync'
import { createServerDatabase } from './server-db'

const now = '2026-10-23T10:00:00.000Z'
const event = { id: 'event', title: 'Original', start: now, end: '2026-10-23T11:00:00.000Z', allDay: false, calendarId: 'calendar', reminders: [], createdAt: now, updatedAt: now }
const calendar = { id: 'calendar', name: 'Personal', color: 'blue' as const, isVisible: true, isDefault: true, createdAt: now, updatedAt: now }
const mutation = (data = event, baseRevision = 0): Mutation => ({ entity: 'events', id: data.id, baseRevision, data, mutationId: crypto.randomUUID(), deleted: false })
let passed = 0
let server = createServerDatabase()
async function test(name: string, work: () => unknown) {
  await db.delete()
  await db.open()
  localStorage.clear()
  server.sql.close()
  server = createServerDatabase()
  useEventStore.setState({ events: [], instances: [] })
  useUIStore.setState({ timezone: 'UTC' })
  await work()
  console.log(`ok ${++passed} - ${name}`)
}
async function push(mutations: Mutation[] = [], cursor = 0, userId = 'personal') {
  const response = await onRequestPost({ request: new Request('https://calendar.test/api/sync', { method: 'POST', body: JSON.stringify({ protocol: 2, cursor, mutations }) }), env: { DB: server.db as never }, data: { userId } })
  assert.equal(response.status, 200)
  return response.json() as Promise<SyncResponse>
}
async function roundTrip(userId = 'personal') {
  const sent = await collectChanges()
  const result = await push(sent.mutations, sent.cursor, userId)
  await applyPull(result, sent)
  return result
}

await test('in-flight edits and unsent deletions survive acknowledgement', async () => {
  await db.events.put(event)
  const sent = await collectChanges()
  await db.events.update(event.id, { title: 'Edited during request' })
  await trackDeletion('task', 'unsent')
  const result = await push(sent.mutations)
  await applyPull(result, sent)
  assert.equal((await db.events.get(event.id))?.title, 'Edited during request')
  assert.equal(await db.syncQueue.count(), 1)
  assert.equal((await collectChanges()).mutations.find(m => m.id === event.id)?.baseRevision, 1)
})
await test('deleting during request does not restore a record', async () => {
  await db.events.put(event)
  const sent = await collectChanges()
  await useEventStore.getState().remove(event.id)
  await applyPull(await push(sent.mutations), sent)
  assert.equal(await db.events.get(event.id), undefined)
  assert.equal(await db.syncQueue.count(), 1)
  await roundTrip()
  assert.equal((await push()).records.at(-1)?.deleted, true)
})
await test('acknowledgement clears only sent deletions', async () => {
  await trackDeletion('event', 'first')
  const sent = await collectChanges()
  await trackDeletion('event', 'second')
  await applyPull(await push(sent.mutations), sent)
  assert.deepEqual((await db.syncQueue.toArray()).map(item => item.entityId), ['second'])
})
await test('nested recurrence edits are collected regardless of client clock', async () => {
  await db.events.put({ ...event, recurrence: { frequency: 'daily', interval: 1 } })
  await roundTrip()
  await db.events.update(event.id, { recurrence: { frequency: 'weekly', interval: 1 }, updatedAt: '2000-01-01T00:00:00.000Z' })
  assert.equal((await collectChanges()).mutations.length, 1)
  await roundTrip()
  assert.equal((await db.events.get(event.id))?.recurrence?.frequency, 'weekly')
})
await test('revision conflicts preserve both versions and allow explicit resolution', async () => {
  await db.events.put(event)
  await roundTrip()
  await push([mutation({ ...event, title: 'Another client', updatedAt: '2000-01-01T00:00:00Z' }, 1)])
  await db.events.update(event.id, { title: 'My version', updatedAt: '2099-01-01T00:00:00Z' })
  const result = await roundTrip()
  assert.equal(result.conflicts.length, 1)
  assert.equal((await db.events.get(event.id))?.title, 'Another client')
  const conflict = (await db.syncConflicts.toArray())[0]
  assert.equal(conflict.local?.title, 'My version')
  await resolveConflict(conflict, 'local')
  await roundTrip()
  assert.equal((await push()).records.at(-1)?.data?.title, 'My version')
})
await test('pull does not silently advance the base revision of an unsent local edit', async () => {
  await db.events.put(event); await roundTrip()
  await db.events.update(event.id, { title: 'Dirty' })
  await push([mutation({ ...event, title: 'Remote' }, 1)])
  const sent = await collectChanges()
  const result = await push([], sent.cursor)
  await applyPull(result, { ...sent, mutations: [], queue: [] })
  assert.equal((await collectChanges()).mutations[0].baseRevision, 1)
})
await test('mutations are idempotent after response loss', async () => {
  const change = mutation()
  await push([change]); await push([change])
  assert.equal((await push()).records.length, 1)
  assert.equal((await push()).records[0].revision, 1)
})
await test('unknown deletion creates a tombstone and conflicts with stale creation', async () => {
  await push([{ ...mutation(), deleted: true, data: undefined }])
  const result = await push([mutation()])
  assert.equal(result.conflicts[0].remote.deleted, true)
})
await test('journal is paginated with a monotonic cursor and isolated by owner', async () => {
  for (let batch = 0; batch < 3; batch++) await push(Array.from({ length: 90 }, (_, i) => mutation({ ...event, id: `event-${batch}-${i}` })))
  const first = await push()
  assert.equal(first.records.length, 200); assert.equal(first.hasMore, true)
  const next = await push([], first.cursor)
  assert.equal(next.records.length, 70); assert.equal(next.hasMore, false)
  assert.equal((await push([], 0, 'other-user')).records.length, 0)
})
await test('two devices converge and a stale device gets an explicit conflict', async () => {
  await openProfile('http://localhost/device-a', 'personal')
  await db.delete(); await db.open(); await db.events.put(event); await roundTrip()
  await openProfile('http://localhost/device-b', 'personal')
  await db.delete(); await db.open(); await roundTrip()
  assert.equal((await db.events.get(event.id))?.title, 'Original')
  await db.events.update(event.id, { title: 'From B' }); await roundTrip()
  await openProfile('http://localhost/device-a', 'personal')
  await db.events.update(event.id, { title: 'From A' }); await roundTrip()
  assert.equal(await db.syncConflicts.count(), 1)
  assert.equal((await db.events.get(event.id))?.title, 'From B')
})
await test('calendar deletion queues tasks and recurrence children atomically', async () => {
  await db.calendars.put(calendar)
  await db.events.bulkPut([event, { ...event, id: 'exception', recurringEventId: event.id, isException: true, exceptionDate: event.start }])
  await db.deletedInstances.put({ id: 'deleted', eventId: event.id, date: now, createdAt: now })
  await db.tasks.put({ id: 'task', title: 'Task', calendarId: calendar.id, completed: false, createdAt: now, updatedAt: now })
  await useCalendarStore.getState().remove(calendar.id)
  assert.equal(await db.tasks.count(), 0); assert.equal(await db.events.count(), 0); assert.equal(await db.deletedInstances.count(), 0)
  assert.equal(await db.syncQueue.count(), 5)
})
await test('JSON backup round trip includes tasks and recurrence exclusions', async () => {
  await db.calendars.put(calendar); await db.events.put(event)
  await db.tasks.put({ id: 'task', title: 'Task', calendarId: calendar.id, completed: false, createdAt: now, updatedAt: now })
  await db.deletedInstances.put({ id: 'deleted', eventId: event.id, date: now, createdAt: now })
  const backup = await createBackup()
  await db.tasks.clear(); await db.events.clear(); await db.deletedInstances.clear()
  await restoreBackup(backup)
  assert.equal(await db.tasks.count(), 1); assert.equal(await db.events.count(), 1); assert.equal(await db.deletedInstances.count(), 1)
  assert.throws(() => parseBackup('{"format":"invalid"}'))
})
await test('invalid restore leaves existing data unchanged', async () => {
  await db.events.put(event)
  await assert.rejects(restoreBackup('{"format":"calendar-backup","version":1,"data":{}}'))
  assert.equal(await db.events.count(), 1)
})
await test('date-only inputs retain their date in other timezones', () => {
  assert.equal(toDatetimeLocalTz('2026-10-23', 'America/Los_Angeles'), '2026-10-23T00:00')
  assert.equal(fromDatetimeLocalTz('2026-10-23', 'UTC'), '2026-10-23T00:00:00.000Z')
})
await test('day boundaries account for DST and extreme timezone offsets', () => {
  for (const [day, hours] of [['2026-03-29', 23], ['2026-10-25', 25]] as const) {
    const { start, end } = dayBounds(day, 'Europe/Bratislava')
    assert.equal((end.getTime() - start.getTime()) / 3600000, hours)
  }
  assert.equal(dayKeyInTz(dayAtMinute('2026-10-23', 60, 'Pacific/Kiritimati').toISOString(), 'Pacific/Kiritimati'), '2026-10-23')
  assert.equal(dayKeyInTz(dayAtMinute('2026-10-23', 60, 'Etc/GMT+12').toISOString(), 'Etc/GMT+12'), '2026-10-23')
})
await test('multi-day events occupy each intersected day and clip to midnight', () => {
  const instance = { event, instanceStart: '2026-10-22T23:00:00Z', instanceEnd: '2026-10-24T01:00:00Z', isRecurring: false }
  const grouped = instancesByDay([instance], 'UTC', '2026-10-22', '2026-10-25')
  assert.equal(grouped.get('2026-10-22')?.length, 1); assert.equal(grouped.get('2026-10-23')?.length, 1)
  assert.equal(grouped.get('2026-10-24')?.length, 1); assert.equal(grouped.get('2026-10-25')?.length, 0)
  assert.deepEqual(segmentMinutes(grouped.get('2026-10-23')![0], 'UTC'), { startMin: 0, durationMin: 1440 })
})
await test('native weekly recurrence retains wall time through DST', async () => {
  const master = { ...event, start: '2026-10-18T08:00:00.000Z', end: '2026-10-18T09:00:00.000Z', timezone: 'Europe/Bratislava', recurrence: { frequency: 'weekly' as const, interval: 1 } }
  const instances = await expandRecurringEvents([master], new Date('2026-10-25T00:00:00Z'), new Date('2026-10-26T00:00:00Z'), 'Europe/Bratislava')
  assert.equal(instances[0]?.instanceStart, '2026-10-25T09:00:00.000Z')
})
await test('UNTIL includes its final calendar day', async () => {
  const master = { ...event, recurrence: { frequency: 'daily' as const, interval: 1, until: '2026-10-24' } }
  assert.equal((await expandRecurringEvents([master], new Date('2026-10-24T00:00:00Z'), new Date('2026-10-24T23:59:59Z'))).length, 1)
})
await test('moved exceptions enter a range even when the original is outside it', async () => {
  const master = { ...event, recurrence: { frequency: 'daily' as const, interval: 1, count: 1 } }
  await db.events.put({ ...event, id: 'exception', recurringEventId: event.id, isException: true, exceptionDate: now, start: '2026-10-27T10:00:00Z', end: '2026-10-27T11:00:00Z' })
  assert.equal((await expandRecurringEvents([master], new Date('2026-10-27T00:00:00Z'), new Date('2026-10-27T23:59:59Z')))[0]?.event.id, 'exception')
})
await test('deleting an exception suppresses its original occurrence', async () => {
  const master = { ...event, recurrence: { frequency: 'daily' as const, interval: 1 } }
  await db.events.bulkPut([master, { ...event, id: 'exception', recurringEventId: event.id, isException: true, exceptionDate: now }])
  await useEventStore.getState().remove('exception')
  assert.equal((await expandRecurringEvents([master], new Date(now), new Date(event.end))).length, 0)
})
await test('split recurrence preserves duration and remaining count', async () => {
  await db.events.put({ ...event, recurrence: { frequency: 'daily', interval: 1, count: 5 } })
  await useEventStore.getState().update(event.id, { title: 'Following' }, 'thisAndFollowing', '2026-10-25T10:00:00.000Z')
  const following = (await db.events.toArray()).find(row => row.id !== event.id)!
  assert.equal(Date.parse(following.end) - Date.parse(following.start), 3600000); assert.equal(following.recurrence?.count, 3)
})
await test('repeated instance edits update one exception', async () => {
  await db.events.put({ ...event, recurrence: { frequency: 'daily', interval: 1 } })
  await useEventStore.getState().update(event.id, { title: 'First' }, 'this', now)
  await useEventStore.getState().update(event.id, { title: 'Second' }, 'this', now)
  assert.equal(await db.events.where('recurringEventId').equals(event.id).count(), 1)
})
await test('ICS round trip preserves weekdays, month days and UTC', () => {
  const weekly = { ...event, recurrence: { frequency: 'weekly' as const, interval: 2, byWeekDay: ['MO', 'WE'] as ('MO' | 'WE')[] } }
  const monthly = { ...event, id: 'monthly', recurrence: { frequency: 'monthly' as const, interval: 1, byMonthDay: [1, 15] } }
  const content = exportICS([weekly, monthly])
  assert.match(content, /DTSTART:20261023T100000Z/)
  const records = importICS(content)
  assert.deepEqual(records[0].recurrence?.byWeekDay, ['MO', 'WE']); assert.deepEqual(records[1].recurrence?.byMonthDay, [1, 15])
})
await test('complex ICS rule, timezone, EXDATE and RECURRENCE-ID round trip', async () => {
  const content = readFileSync('tests/fixtures/calendar.ics', 'utf8')
  await saveICS(content, calendar.id)
  const records = await db.events.toArray()
  assert.equal(records.length, 2)
  const master = records.find(row => !row.exceptionDate)!
  const exception = records.find(row => row.exceptionDate)!
  assert.equal(exception.recurringEventId, master.id)
  const exported = exportICS(records)
  for (const token of ['VTIMEZONE', 'BYSETPOS=1', 'EXDATE', 'RECURRENCE-ID']) assert.ok(exported.includes(token))
  assert.equal(importICS(exported).length, 2)
  await saveICS(content, calendar.id)
  assert.equal(await db.events.count(), 2)
})
await test('ICS local deletion is exported as EXDATE', () => {
  const content = exportICS([{ ...event, recurrence: { frequency: 'daily', interval: 1 } }], 'Calendar', [{ id: 'deleted', eventId: event.id, date: now, createdAt: now }])
  assert.match(content, /EXDATE:20261023T100000Z/)
})
await test('day query uses selected timezone instead of system timezone', async () => {
  useUIStore.setState({ timezone: 'Pacific/Kiritimati' })
  await db.events.put({ ...event, start: '2026-10-22T12:00:00Z', end: '2026-10-22T13:00:00Z' })
  await useEventStore.getState().loadRange(new Date(2026, 9, 23), 'day')
  assert.equal(useEventStore.getState().instances.length, 1)
})
await test('session expires and a static password is not a bearer token', async () => {
  const env = { DB: server.db as never, AUTH_TOKEN: 'secret' }
  const session = await createSession('personal', 'secret')
  const request = (token: string) => new Request('https://calendar.test/api/sync', { headers: { Authorization: `Bearer ${token}` } })
  assert.equal((await readSession(request(session.token), env))?.userId, 'personal')
  assert.equal(await readSession(request('secret'), env), null)
  const expired = await createSession('personal', 'secret', Date.now() - 1)
  assert.equal(await readSession(request(expired.token), env), null)
})
await test('login limits attempts and issues an HttpOnly expiring session', async () => {
  const env = { DB: server.db as never, AUTH_TOKEN: 'secret' }
  const login = (password: string) => authenticate({ env, request: new Request('https://calendar.test/api/auth', { method: 'POST', body: JSON.stringify({ password }) }) })
  const response = await login('secret')
  assert.equal(response.status, 200); assert.match(response.headers.get('Set-Cookie')!, /HttpOnly/)
  assert.notEqual((await response.json()).token, 'secret')
  for (let attempt = 0; attempt < 9; attempt++) assert.equal((await login('wrong')).status, 401)
  assert.equal((await login('secret')).status, 429)
})
await test('CORS allows configured origins and rejects other websites', async () => {
  const context = { env: { DB: server.db as never, AUTH_TOKEN: 'secret', ALLOWED_ORIGINS: 'https://app.test' }, data: {}, next: async () => Response.json({}), request: new Request('https://calendar.test/api/auth', { method: 'OPTIONS', headers: { Origin: 'https://app.test' } }) }
  const response = await onRequest(context)
  assert.equal(response.status, 204); assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://app.test')
  assert.equal((await onRequest({ ...context, request: new Request('https://calendar.test/api/auth', { headers: { Origin: 'https://evil.test' } }) })).status, 403)
})
await test('unauthorized response clears in-memory session', async () => {
  setAuthToken('expired')
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => Response.json({ error: 'Unauthorized' }, { status: 401 })
  try { await syncOnce(); assert.equal(hasAuthToken(), false) } finally { globalThis.fetch = originalFetch }
})
await test('server batch failure rolls back every mutation', async () => {
  server.sql.exec("CREATE TRIGGER fail_insert BEFORE INSERT ON sync_records WHEN NEW.id = 'bad' BEGIN SELECT RAISE(ABORT, 'test failure'); END")
  const originalError = console.error
  console.error = () => {}
  try {
    const response = await onRequestPost({ request: new Request('https://calendar.test/api/sync', { method: 'POST', body: JSON.stringify({ protocol: 2, cursor: 0, mutations: [mutation({ ...event, id: 'good' }), mutation({ ...event, id: 'bad' })] }) }), env: { DB: server.db as never }, data: { userId: 'personal' } })
    assert.equal(response.status, 500)
    assert.equal(server.sql.prepare('SELECT * FROM sync_records').all().length, 0)
  } finally { console.error = originalError }
})
await test('legacy migration backfills personal data once', () => {
  server.sql.prepare('INSERT INTO calendars(id,name,color,createdAt,updatedAt) VALUES (?,?,?,?,?)').run('legacy', 'Legacy', 'blue', now, now)
  const migration = readFileSync('api/migrations/0001_revision_sync.sql', 'utf8')
  server.sql.exec(migration); server.sql.exec(migration)
  assert.equal(server.sql.prepare('SELECT * FROM sync_records WHERE id = ?').all('legacy').length, 1)
  assert.equal(server.sql.prepare('SELECT * FROM sync_log WHERE id = ?').all('legacy').length, 1)
})
await test('responses from a previous account cannot enter another local profile', async () => {
  await db.events.put(event)
  const sent = await collectChanges()
  const result = await push(sent.mutations)
  await openProfile('http://localhost/another-account', 'alice')
  await db.delete(); await db.open()
  await assert.rejects(applyPull(result, sent), /Account changed/)
  assert.equal(await db.events.count(), 0)
})
await test('server calendar deletion also removes records created by another device', async () => {
  const change: Mutation = { entity: 'calendars', id: calendar.id, baseRevision: 0, deleted: false, data: calendar, mutationId: crypto.randomUUID() }
  await push([change, mutation()])
  const result = await push([{ ...change, deleted: true, data: undefined, baseRevision: 1, mutationId: crypto.randomUUID() }])
  assert.equal(result.records.at(-1)?.deleted, true)
  assert.equal((await push([mutation({ ...event, id: 'late' })])).conflicts.length, 1)
})
await test('encrypted backup restores exactly and rejects tampering', () => {
  const directory = mkdtempSync(join(tmpdir(), 'calendar-backup-'))
  const source = join(directory, 'source.sql')
  const encrypted = join(directory, 'backup.enc')
  const restored = join(directory, 'restored.sql')
  const env = { ...process.env, BACKUP_ENCRYPTION_KEY: randomBytes(32).toString('base64') }
  try {
    writeFileSync(source, 'CREATE TABLE sample(id TEXT);')
    assert.equal(spawnSync(process.execPath, ['scripts/encrypt-backup.mjs', 'encrypt', source, encrypted], { env }).status, 0)
    assert.equal(spawnSync(process.execPath, ['scripts/encrypt-backup.mjs', 'decrypt', encrypted, restored], { env }).status, 0)
    assert.equal(readFileSync(source, 'utf8'), readFileSync(restored, 'utf8'))
    const bytes = readFileSync(encrypted); bytes[bytes.length - 1] ^= 1; writeFileSync(encrypted, bytes)
    assert.notEqual(spawnSync(process.execPath, ['scripts/encrypt-backup.mjs', 'decrypt', encrypted, restored], { env }).status, 0)
  } finally { rmSync(directory, { recursive: true, force: true }) }
})
await db.delete()
server.sql.close()
console.log(`${passed} regression tests passed`)
