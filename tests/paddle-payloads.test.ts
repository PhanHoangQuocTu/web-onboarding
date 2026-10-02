import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/activation/route'
import { POST as redeem } from '@/app/api/activation/redeem/route'
import { db } from '@/lib/server/db'
import transactionCompleted from './fixtures/paddle-transaction-completed.json'
import subscriptionUpdated from './fixtures/paddle-subscription-updated.json'
import { codeFor, jsonRequest, randomUUID, sendEvent } from './helpers'

// Example payloads copied verbatim from developer.paddle.com/webhooks.
describe('Paddle documented webhook payloads', () => {
  it('issues a code and reports entitlement from real payload shapes', async () => {
    vi.stubEnv('NEXT_PUBLIC_PADDLE_PRICE_WEEKLY', 'pri_01gsz8x8sawmvhz1pv30nge1ke')
    const sessionId = randomUUID()
    const txn = transactionCompleted.data
    const sub = subscriptionUpdated.data

    const completed = {
      ...transactionCompleted,
      data: { ...txn, custom_data: { session_id: sessionId } },
    }
    expect((await sendEvent(completed)).status).toBe(200)
    expect((await sendEvent(subscriptionUpdated)).status).toBe(200)

    const { rows } = await db.query('SELECT * FROM transactions WHERE id = $1', [txn.id])
    expect(rows[0]).toMatchObject({
      subscription_id: sub.id,
      customer_id: txn.customer_id,
      session_id: sessionId,
      status: 'completed',
      total: '65215',
      currency: 'USD',
    })
    const [code] = await codeFor(sub.id)
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{12}$/)

    const query = new URLSearchParams({ transactionId: txn.id, sessionId })
    const activation = await GET(new NextRequest(`http://test/api/activation?${query}`))
    expect(activation.status).toBe(200)
    const expected = {
      premium: false,
      status: 'active',
      plan: 'weekly',
      expiresAt: new Date(sub.current_billing_period.ends_at).toISOString(),
    }
    expect(await activation.json()).toEqual({ code: code.match(/.{4}/g)!.join('-'), ...expected })

    const redeemed = await redeem(
      jsonRequest('http://test/api/activation/redeem', { code, deviceId: 'device-a' }),
    )
    expect(await redeemed.json()).toEqual({ ...expected, activeOnThisDevice: true })
  })
})
