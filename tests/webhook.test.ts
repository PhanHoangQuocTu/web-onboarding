import { describe, expect, it } from 'vitest'
import { POST } from '@/app/api/paddle/webhook/route'
import { db } from '@/lib/server/db'
import {
  codeFor,
  DAY,
  isoIn,
  paddleId,
  sendEvent,
  sign,
  subscriptionEvent,
  transaction,
  transactionEvent,
  webhookRequest,
} from './helpers'

const subscription = async (id: string) =>
  (await db.query('SELECT * FROM subscriptions WHERE id = $1', [id])).rows[0]
const eventCount = async (id: string) =>
  Number((await db.query('SELECT count(*) FROM webhook_events WHERE id = $1', [id])).rows[0].count)

describe('POST /api/paddle/webhook: signature', () => {
  const event = transactionEvent(transaction())

  it('returns 500 when the secret is not configured', async () => {
    const saved = process.env.PADDLE_WEBHOOK_SECRET
    delete process.env.PADDLE_WEBHOOK_SECRET
    try {
      expect((await POST(webhookRequest(event))).status).toBe(500)
    } finally {
      process.env.PADDLE_WEBHOOK_SECRET = saved
    }
  })

  it.each([
    ['missing header', () => null],
    ['wrong secret', (body: string) => sign(body, { secret: 'other' })],
    ['stale timestamp', (body: string) => sign(body, { ts: Math.floor(Date.now() / 1000) - 60 })],
    ['signature for another body', () => sign('{}')],
  ])('rejects %s with 401 and stores nothing', async (_, signature) => {
    const fresh = transactionEvent(transaction())
    expect((await POST(webhookRequest(fresh, signature(JSON.stringify(fresh))))).status).toBe(401)
    expect(await eventCount(fresh.event_id)).toBe(0)
  })

  it('accepts a valid signature (control)', async () => {
    const res = await POST(webhookRequest(event))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(await eventCount(event.event_id)).toBe(1)
  })
})

describe('POST /api/paddle/webhook: transactions', () => {
  it.each(['transaction.completed', 'transaction.paid'])('%s issues one code', async (type) => {
    const txn = transaction()
    expect((await sendEvent(transactionEvent(txn, type))).status).toBe(200)
    const codes = await codeFor(txn.subscription_id!)
    expect(codes).toHaveLength(1)
    expect(codes[0]).toMatch(/^[A-HJ-NP-Z2-9]{12}$/)
    const { rows } = await db.query('SELECT * FROM transactions WHERE id = $1', [txn.id])
    expect(rows[0]).toMatchObject({
      subscription_id: txn.subscription_id,
      session_id: txn.custom_data!.session_id,
      status: 'completed',
      total: '699',
      currency: 'USD',
    })
    expect(await subscription(txn.subscription_id!)).toMatchObject({
      status: 'active',
      price_id: 'pri_weekly',
      current_period_end: new Date(txn.billing_period!.ends_at),
    })
  })

  it.each(['draft', 'ready', 'billed', 'canceled', 'past_due'])(
    'does not issue a code for a %s transaction',
    async (status) => {
      const txn = transaction({ status })
      await sendEvent(transactionEvent(txn))
      expect(await codeFor(txn.subscription_id!)).toEqual([])
      expect(await subscription(txn.subscription_id!)).toBeUndefined()
    },
  )

  it('does not issue a code for a one-time transaction without a subscription', async () => {
    const txn = transaction({ subscription_id: null })
    await sendEvent(transactionEvent(txn))
    const { rows } = await db.query('SELECT subscription_id FROM transactions WHERE id = $1', [
      txn.id,
    ])
    expect(rows[0].subscription_id).toBeNull()
  })

  it('ignores a duplicate event_id', async () => {
    const txn = transaction()
    const event = transactionEvent(txn)
    await sendEvent(event)
    const replay = { ...event, data: { ...txn, status: 'canceled' } }
    expect((await sendEvent(replay)).status).toBe(200)
    const { rows } = await db.query('SELECT status FROM transactions WHERE id = $1', [txn.id])
    expect(rows[0].status).toBe('completed')
    expect(await eventCount(event.event_id)).toBe(1)
  })

  it('keeps the same code on renewal and the original session', async () => {
    const first = transaction()
    await sendEvent(transactionEvent(first))
    const [code] = await codeFor(first.subscription_id!)
    const renewal = transaction({ subscription_id: first.subscription_id, session_id: null })
    await sendEvent(transactionEvent(renewal))
    expect(await codeFor(first.subscription_id!)).toEqual([code])
    expect((await subscription(first.subscription_id!)).session_id).toBe(
      first.custom_data!.session_id,
    )
  })

  it('upgrades a stored transaction when it later becomes paid', async () => {
    const txn = transaction({ status: 'billed' })
    await sendEvent(transactionEvent(txn))
    await sendEvent(transactionEvent({ ...txn, status: 'paid' }, 'transaction.paid'))
    expect(await codeFor(txn.subscription_id!)).toHaveLength(1)
  })

  it('handles a transaction without totals, items or billing period', async () => {
    const txn = { ...transaction(), details: null, items: [{ price: null }], billing_period: null }
    await sendEvent(transactionEvent(txn))
    const { rows } = await db.query('SELECT total, currency FROM transactions WHERE id = $1', [
      txn.id,
    ])
    expect(rows[0]).toEqual({ total: null, currency: 'USD' })
    expect(await subscription(txn.subscription_id!)).toMatchObject({
      price_id: null,
      current_period_end: null,
    })
    expect(await codeFor(txn.subscription_id!)).toHaveLength(1)
  })

  it('stores null currency when Paddle omits it', async () => {
    const { currency_code: _, ...txn } = { ...transaction(), details: {} }
    await sendEvent(transactionEvent(txn))
    const { rows } = await db.query('SELECT currency FROM transactions WHERE id = $1', [txn.id])
    expect(rows[0].currency).toBeNull()
  })

  it('ignores a malformed session_id', async () => {
    const txn = transaction()
    txn.custom_data = { session_id: 'not-a-uuid' }
    await sendEvent(transactionEvent(txn))
    const { rows } = await db.query('SELECT session_id FROM transactions WHERE id = $1', [txn.id])
    expect(rows[0].session_id).toBeNull()
  })

  it('issues exactly one code under concurrent webhooks', async () => {
    const subscriptionId = paddleId('sub')
    const events = Array.from({ length: 10 }, () =>
      transactionEvent(transaction({ subscription_id: subscriptionId })),
    )
    const statuses = await Promise.all(events.map(async (e) => (await sendEvent(e)).status))
    expect(statuses).toEqual(Array(10).fill(200))
    expect(await codeFor(subscriptionId)).toHaveLength(1)
  })
})

describe('POST /api/paddle/webhook: subscriptions', () => {
  it('applies the newest state and ignores older events that arrive late', async () => {
    const txn = transaction()
    const id = txn.subscription_id!
    await sendEvent(transactionEvent(txn))
    await sendEvent(
      subscriptionEvent(id, isoIn(2000), {
        status: 'canceled',
        ends_at: null,
        canceled_at: isoIn(2000),
      }),
    )
    await sendEvent(subscriptionEvent(id, isoIn(1000), { status: 'active' }))
    const sub = await subscription(id)
    expect(sub.status).toBe('canceled')
    expect(sub.current_period_end).toEqual(new Date(txn.billing_period!.ends_at))
    expect(sub.canceled_at).not.toBeNull()
  })

  it('applies an event with the same timestamp', async () => {
    const id = transaction().subscription_id!
    const at = isoIn(0)
    await sendEvent(subscriptionEvent(id, at, { status: 'active' }))
    await sendEvent(subscriptionEvent(id, at, { status: 'past_due' }))
    expect((await subscription(id)).status).toBe('past_due')
  })

  it('keeps authoritative subscription state when the transaction arrives later', async () => {
    const txn = transaction()
    const id = txn.subscription_id!
    const end = isoIn(30 * DAY)
    await sendEvent(
      subscriptionEvent(id, isoIn(0), { status: 'trialing', ends_at: end, price_id: 'pri_trial' }),
    )
    await sendEvent(transactionEvent(txn))
    expect(await subscription(id)).toMatchObject({
      status: 'trialing',
      price_id: 'pri_trial',
      current_period_end: new Date(end),
      session_id: txn.custom_data!.session_id,
    })
    expect(await codeFor(id)).toHaveLength(1)
  })

  it('keeps the price when a subscription event has no items', async () => {
    const txn = transaction()
    const id = txn.subscription_id!
    await sendEvent(transactionEvent(txn))
    const event = subscriptionEvent(id, isoIn(1000))
    await sendEvent({ ...event, data: { ...event.data, items: [] } })
    expect((await subscription(id)).price_id).toBe('pri_weekly')
  })

  it('updates the period end on renewal', async () => {
    const txn = transaction()
    const id = txn.subscription_id!
    await sendEvent(transactionEvent(txn))
    const next = isoIn(14 * DAY)
    await sendEvent(subscriptionEvent(id, isoIn(1000), { ends_at: next }))
    expect((await subscription(id)).current_period_end).toEqual(new Date(next))
  })

  it('rolls back a failed event so Paddle can retry it', async () => {
    const id = paddleId('sub')
    const bad = subscriptionEvent(id, isoIn(0), { status: null as unknown as string })
    await expect(sendEvent(bad)).rejects.toThrow()
    expect(await eventCount(bad.event_id)).toBe(0)
    const retry = { ...bad, data: { ...bad.data, status: 'active' } }
    expect((await sendEvent(retry)).status).toBe(200)
    expect((await subscription(id)).status).toBe('active')
  })
})

describe('POST /api/paddle/webhook: other events', () => {
  it('stores and updates customer email', async () => {
    const id = paddleId('ctm')
    for (const [type, email] of [
      ['customer.created', 'a@example.com'],
      ['customer.updated', 'b@example.com'],
    ])
      await sendEvent({
        event_id: paddleId('evt'),
        event_type: type,
        occurred_at: isoIn(0),
        data: { id, email },
      })
    const { rows } = await db.query('SELECT email FROM paddle_customers WHERE id = $1', [id])
    expect(rows).toEqual([{ email: 'b@example.com' }])
  })

  it('acknowledges unhandled event types', async () => {
    const event = {
      event_id: paddleId('evt'),
      event_type: 'adjustment.created',
      occurred_at: isoIn(0),
      data: {},
    }
    expect((await sendEvent(event)).status).toBe(200)
    expect(await eventCount(event.event_id)).toBe(1)
  })
})
