import { describe, expect, it, vi } from 'vitest'

vi.mock('node:crypto', async (original) => ({
  ...(await original<typeof import('node:crypto')>()),
  randomBytes: (size: number) => Buffer.alloc(size),
}))

const { db } = await import('@/lib/server/db')
const { codeFor, sendEvent, transaction, transactionEvent } = await import('./helpers')

describe('activation code collisions', () => {
  it('fails the webhook instead of reusing another subscription code', async () => {
    const first = transaction()
    await sendEvent(transactionEvent(first))
    expect(await codeFor(first.subscription_id!)).toEqual(['AAAAAAAAAAAA'])

    const second = transaction()
    const event = transactionEvent(second)
    await expect(sendEvent(event)).rejects.toThrow('Could not issue an activation code')
    expect(await codeFor(second.subscription_id!)).toEqual([])
    const { rows } = await db.query('SELECT count(*) FROM webhook_events WHERE id = $1', [
      event.event_id,
    ])
    expect(Number(rows[0].count)).toBe(0)
  })
})
