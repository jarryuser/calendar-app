import { randomBytes, pbkdf2Sync } from 'node:crypto'

let password = ''
for await (const chunk of process.stdin) password += chunk
password = password.replace(/\r?\n$/, '')
if (!password) throw new Error('Provide a password on stdin')
const salt = randomBytes(16)
const hash = pbkdf2Sync(password, salt, 100_000, 32, 'sha256')
console.log(JSON.stringify({ salt: salt.toString('base64url'), hash: hash.toString('base64url') }))
