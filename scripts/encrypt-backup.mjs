import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const [mode, input, output] = process.argv.slice(2)
const key = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY || '', 'base64')
if (key.length !== 32) throw new Error('BACKUP_ENCRYPTION_KEY must be a base64-encoded 32-byte key')
if (!input || !output || !['encrypt', 'decrypt'].includes(mode)) throw new Error('Usage: node scripts/encrypt-backup.mjs encrypt|decrypt input output')
const bytes = readFileSync(input)
if (mode === 'encrypt') {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()])
  writeFileSync(output, Buffer.concat([Buffer.from('CAL1'), iv, cipher.getAuthTag(), ciphertext]), { mode: 0o600 })
} else {
  if (bytes.subarray(0, 4).toString() !== 'CAL1') throw new Error('Invalid encrypted backup')
  const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(4, 16))
  decipher.setAuthTag(bytes.subarray(16, 32))
  const plaintext = Buffer.concat([decipher.update(bytes.subarray(32)), decipher.final()])
  writeFileSync(output, plaintext, { mode: 0o600 })
}
