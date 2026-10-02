import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const root = path.join(import.meta.dirname, '..')
const dir = path.join(root, 'db', 'migrations')
const required = ['POSTGRES_HOST', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB']
if (!process.env.POSTGRES_HOST) {
  try {
    process.loadEnvFile(path.join(root, '.env.local'))
  } catch {}
}
const missing = required.filter((name) => !process.env[name])
if (missing.length) throw new Error(`Missing ${missing.join(', ')}`)
const client = new pg.Client({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT) || 5432,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
})
await client.connect()
try {
  await client.query('SELECT pg_advisory_lock(727001)')
  await client.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  )
  const { rows } = await client.query('SELECT name FROM schema_migrations')
  const applied = new Set(rows.map((row) => row.name))
  const files = (await readdir(dir)).filter((file) => file.endsWith('.sql')).sort()
  for (const file of files) {
    if (applied.has(file)) continue
    const sql = await readFile(path.join(dir, file), 'utf8')
    await client.query('BEGIN')
    try {
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
      await client.query('COMMIT')
      console.log(`applied ${file}`)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  }
} finally {
  await client.end()
}
