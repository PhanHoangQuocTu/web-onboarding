import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/activation/route'
import { db } from '@/lib/server/db'
import {
  codeFor,
  DAY,
  isoIn,
  paddleId,
  randomUUID,
  saveSession,
  sendEvent,
  subscriptionEvent,
  transaction,
  transactionEvent,
} from './helpers'

const get = async (transactionId: string, sessionId: string, ip?: string) => {
  const query = new URLSearchParams({ transactionId, sessionId })
  const headers = ip ? { 'x-forwarded-for': ip } : undefined
  const res = await GET(new NextRequest(`http://test/api/activation?${query}`, { headers }))
  return { status: res.status, body: await res.json() }
}
const sessionOf = (txn: ReturnType<typeof transaction>) => txn.custom_data!.session_id as string

const paddleReturns = (response: Response | (() => never)) => {
  vi.stubEnv('PADDLE_API_KEY', 'key_123')
  const fn = vi.fn(async () => (typeof response === 'function' ? response() : response))
  vi.stubGlobal('fetch', fn)
  return fn
}

describe('GET /api/activation', () => {
  it('returns the formatted code and entitlement after the webhook (control)', async () => {
    const txn = transaction()
    await sendEvent(transactionEvent(txn))
    const [code] = await codeFor(txn.subscription_id!)
    const res = await get(txn.id, txn.custom_data!.session_id as string)
    expect(res).toEqual({
      status: 200,
      body: {
        code: code.match(/.{4}/g)!.join('-'),
        premium: true,
        status: 'active',
        plan: 'weekly',
        expiresAt: new Date(txn.billing_period!.ends_at).toISOString(),
      },
    })
  })

  it.each([
    ['bad transaction id', 'txn_123', randomUUID()],
    ['uppercase transaction id', paddleId('txn').toUpperCase(), randomUUID()],
    ['other id prefix', paddleId('sub'), randomUUID()],
    ['bad session id', paddleId('txn'), 'nope'],
    ['missing params', '', ''],
  ])('rejects %s with 400', async (_, transactionId, sessionId) => {
    expect((await get(transactionId, sessionId)).status).toBe(400)
  })

  it('returns 400 when params are absent', async () => {
    expect((await GET(new NextRequest('http://test/api/activation'))).status).toBe(400)
  })

  it('returns 404 for an unknown transaction without calling Paddle when no API key', async () => {
    const fn = vi.fn()
    vi.stubGlobal('fetch', fn)
    expect((await get(paddleId('txn'), randomUUID())).status).toBe(404)
    expect(fn).not.toHaveBeenCalled()
  })

  it('returns 404 for the wrong session', async () => {
    const txn = transaction()
    await sendEvent(transactionEvent(txn))
    expect((await get(txn.id, randomUUID())).status).toBe(404)
  })

  it('returns 202 while the transaction is not paid yet', async () => {
    const txn = transaction({ status: 'billed' })
    await sendEvent(transactionEvent(txn))
    expect(await get(txn.id, txn.custom_data!.session_id as string)).toEqual({
      status: 202,
      body: { pending: true },
    })
  })

  it('returns 202 for a one-time transaction that has no subscription', async () => {
    const txn = transaction({ subscription_id: null })
    await sendEvent(transactionEvent(txn))
    expect((await get(txn.id, txn.custom_data!.session_id as string)).status).toBe(202)
  })

  it('returns the code with premium false after cancellation', async () => {
    const txn = transaction()
    await sendEvent(transactionEvent(txn))
    await sendEvent(subscriptionEvent(txn.subscription_id!, isoIn(1000), { status: 'canceled' }))
    const res = await get(txn.id, txn.custom_data!.session_id as string)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ premium: false, status: 'canceled' })
  })

  it('returns premium false once the period ended beyond the grace window', async () => {
    const txn = transaction({ ends_at: isoIn(-2 * DAY) })
    await sendEvent(transactionEvent(txn))
    const res = await get(txn.id, txn.custom_data!.session_id as string)
    expect(res.body).toMatchObject({ premium: false, status: 'active' })
  })
})

describe('GET /api/activation: Paddle API fallback', () => {
  it('verifies a paid transaction with Paddle when the webhook is late', async () => {
    const txn = transaction()
    await saveSession(sessionOf(txn))
    const fn = paddleReturns(Response.json({ data: txn }))
    const res = await get(txn.id, txn.custom_data!.session_id as string)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(res.status).toBe(200)
    expect(res.body.code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/)
    expect(await codeFor(txn.subscription_id!)).toHaveLength(1)
  })

  it('does not call Paddle again once the code exists', async () => {
    const txn = transaction()
    await sendEvent(transactionEvent(txn))
    const fn = paddleReturns(Response.json({ data: txn }))
    expect((await get(txn.id, txn.custom_data!.session_id as string)).status).toBe(200)
    expect(fn).not.toHaveBeenCalled()
  })

  it('returns 404 when Paddle does not know the transaction', async () => {
    const session = randomUUID()
    await saveSession(session)
    const fn = paddleReturns(Response.json({}, { status: 404 }))
    expect((await get(paddleId('txn'), session)).status).toBe(404)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('does not call Paddle for a session that was never saved', async () => {
    const txn = transaction()
    const fn = paddleReturns(Response.json({ data: txn }))
    expect((await get(txn.id, sessionOf(txn))).status).toBe(404)
    expect(fn).not.toHaveBeenCalled()
    expect(await codeFor(txn.subscription_id!)).toEqual([])
  })

  it('caps Paddle calls at 120 a minute across all clients', async () => {
    const session = randomUUID()
    await saveSession(session)
    const fn = paddleReturns(Response.json({}, { status: 404 }))
    for (let i = 0; i < 125; i++)
      expect((await get(paddleId('txn'), session, `198.51.100.${i}`)).status).toBe(404)
    expect(fn).toHaveBeenCalledTimes(120)
  })

  it('returns 202 when Paddle reports the transaction is not paid', async () => {
    const txn = transaction({ status: 'ready' })
    await saveSession(sessionOf(txn))
    paddleReturns(Response.json({ data: txn }))
    expect((await get(txn.id, txn.custom_data!.session_id as string)).status).toBe(202)
    expect(await codeFor(txn.subscription_id!)).toEqual([])
  })

  it('returns 404 when the verified transaction belongs to another session', async () => {
    const txn = transaction()
    const other = randomUUID()
    await saveSession(other)
    const fn = paddleReturns(Response.json({ data: txn }))
    expect((await get(txn.id, other)).status).toBe(404)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('fails the request when Paddle errors, so the client retries', async () => {
    const session = randomUUID()
    await saveSession(session)
    paddleReturns(Response.json({}, { status: 503 }))
    await expect(get(paddleId('txn'), session)).rejects.toThrow('503')
  })

  it('stays consistent when webhook and fallback race', async () => {
    const txn = transaction()
    paddleReturns(Response.json({ data: txn }))
    const session = sessionOf(txn)
    await saveSession(session)
    const [, a, b] = await Promise.all([
      sendEvent(transactionEvent(txn)),
      get(txn.id, session),
      get(txn.id, session),
    ])
    expect(a.body.code).toBe(b.body.code)
    expect(await codeFor(txn.subscription_id!)).toHaveLength(1)
    const { rows } = await db.query('SELECT count(*) FROM transactions WHERE id = $1', [txn.id])
    expect(Number(rows[0].count)).toBe(1)
  })
})

describe('GET /api/activation: rate limit', () => {
  it('returns 429 after 30 requests a minute from one IP, other IPs unaffected', async () => {
    for (let i = 0; i < 30; i++)
      expect((await get(paddleId('txn'), randomUUID(), '203.0.113.9')).status).toBe(404)
    expect((await get(paddleId('txn'), randomUUID(), '203.0.113.9')).status).toBe(429)
    expect((await get(paddleId('txn'), randomUUID(), '203.0.113.10')).status).toBe(404)
  })
})
