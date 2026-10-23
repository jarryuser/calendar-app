import { build } from 'esbuild'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const directory = await mkdtemp(join(tmpdir(), 'calendar-tests-'))
try {
  const result = await build({
    entryPoints: ['tests/regression.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    alias: { '@': './src' },
  })
  const file = join(directory, 'regression.mjs')
  await writeFile(file, result.outputFiles[0].text)
  await import(pathToFileURL(file).href)
} finally {
  await rm(directory, { recursive: true, force: true })
}
