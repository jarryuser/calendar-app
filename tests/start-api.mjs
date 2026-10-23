import { build } from 'esbuild'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const directory = mkdtempSync(join(tmpdir(), 'calendar-api-'))
process.on('exit', () => rmSync(directory, { recursive: true, force: true }))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => process.exit())
const result = await build({ entryPoints: ['tests/http-server.ts'], bundle: true, platform: 'node', format: 'esm', write: false })
const file = join(directory, 'server.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
