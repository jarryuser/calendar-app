import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'

export function createServerDatabase() {
  const sql = new DatabaseSync(':memory:')
  sql.exec(readFileSync('api/schema.sql', 'utf8'))
  const db = {
    prepare(query: string, values: unknown[] = []) {
      return {
        bind(...params: unknown[]) { return db.prepare(query, params) },
        async run() { return sql.prepare(query).run(...values as never[]) },
        async first() { return sql.prepare(query).get(...values as never[]) || null },
        async all() { return { results: sql.prepare(query).all(...values as never[]) } },
      }
    },
    async batch(statements: { run: () => Promise<unknown> }[]) {
      sql.exec('BEGIN')
      try {
        for (const statement of statements) await statement.run()
        sql.exec('COMMIT')
      } catch (error) { sql.exec('ROLLBACK'); throw error }
      return []
    },
  }
  return { sql, db }
}
