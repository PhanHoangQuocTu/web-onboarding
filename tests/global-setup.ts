import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import pg from 'pg'
import type { TestProject } from 'vitest/node'

declare module 'vitest' {
  interface ProvidedContext {
    pgEnv: Record<string, string>
  }
}

export default async function setup(project: TestProject) {
  const serverUrl = process.env.TEST_DATABASE_URL
  if (!serverUrl) throw new Error('Set TEST_DATABASE_URL to a disposable Postgres server')

  const name = `test_${randomBytes(6).toString('hex')}`
  const admin = new pg.Client({ connectionString: serverUrl })
  await admin.connect()
  await admin.query(`CREATE DATABASE ${name}`)

  const url = new URL(serverUrl)
  const pgEnv = {
    POSTGRES_HOST: url.hostname,
    POSTGRES_PORT: url.port || '5432',
    POSTGRES_USER: decodeURIComponent(url.username),
    POSTGRES_PASSWORD: decodeURIComponent(url.password),
    POSTGRES_DB: name,
  }
  execFileSync('node', ['scripts/migrate.mjs'], {
    env: { ...process.env, ...pgEnv },
    stdio: 'inherit',
  })
  project.provide('pgEnv', pgEnv)

  return async () => {
    await admin.query(`DROP DATABASE ${name} WITH (FORCE)`)
    await admin.end()
  }
}
