import { mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const encrypt = process.argv.includes('--encrypt')
if (encrypt && Buffer.from(process.env.BACKUP_ENCRYPTION_KEY || '', 'base64').length !== 32) throw new Error('Configure BACKUP_ENCRYPTION_KEY before exporting')
mkdirSync('backups', { recursive: true, mode: 0o700 })
const file = join('backups', `calendar-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`)
const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const exportResult = spawnSync(executable, ['wrangler', 'd1', 'export', 'calendar-db', '--remote', '--output', file], { stdio: 'inherit' })
if (exportResult.status !== 0) process.exit(exportResult.status || 1)
const check = spawnSync(process.execPath, ['scripts/check-backup.mjs', file], { stdio: 'inherit' })
if (check.status !== 0) process.exit(check.status || 1)
if (encrypt) {
  const encryption = spawnSync(process.execPath, ['scripts/encrypt-backup.mjs', 'encrypt', file, `${file}.enc`], { stdio: 'inherit' })
  process.exit(encryption.status || 0)
}
