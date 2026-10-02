import 'server-only'
import { Pool, type PoolClient } from 'pg'

const globalForDb = globalThis as unknown as { pgPool?: Pool }

export const db =
  globalForDb.pgPool ??
  new Pool({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT) || 5432,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    max: 10,
  })
if (process.env.NODE_ENV !== 'production') globalForDb.pgPool = db

export async function withTransaction<T>(run: (client: PoolClient) => Promise<T>) {
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const result = await run(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
