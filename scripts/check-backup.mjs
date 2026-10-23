import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'

const filename = process.argv[2]
if (!filename) throw new Error('Usage: node scripts/check-backup.mjs backup.sql')
const database = new DatabaseSync(':memory:')
try {
  database.exec(readFileSync(filename, 'utf8'))
  if (database.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('Backup integrity check failed')
  for (const table of ['sync_records', 'sync_log', 'auth_attempts']) database.prepare(`SELECT COUNT(*) FROM ${table}`).get()
  const invalid = database.prepare('SELECT COUNT(*) AS count FROM sync_records WHERE payload IS NOT NULL AND NOT json_valid(payload)').get().count
  if (invalid) throw new Error('Invalid record payloads in backup')
  const missing = database.prepare(`SELECT COUNT(*) AS count FROM sync_records record WHERE NOT EXISTS (
    SELECT 1 FROM sync_log log WHERE log.owner = record.owner AND log.entity = record.entity AND log.id = record.id AND log.revision = record.revision
  )`).get().count
  if (missing) throw new Error('Backup is missing journal revisions')
  console.log('Backup restored successfully and passed integrity checks')
} finally { database.close() }
