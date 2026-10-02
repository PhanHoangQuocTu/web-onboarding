import { describe, expect, it } from 'vitest'
import { POST } from '@/app/api/activation/redeem/route'
import { POST as STATUS } from '@/app/api/activation/status/route'
import { db } from '@/lib/server/db'
import {
  codeFor,
  DAY,
  isoIn,
  jsonRequest,
  sendEvent,
  subscriptionEvent,
  transaction,
  transactionEvent,
} from './helpers'

const post = async (body: unknown, headers?: Record<string, string>) => {
  const res = await POST(jsonRequest('http://test/api/activation/redeem', body, headers))
  return { status: res.status, body: await res.json(), headers: res.headers }
}
const redeem = async (body: unknown) => {
  const { status, body: json } = await post(body)
  return { status, body: json }
}
const claim = (code: string, deviceId = 'device-a') => redeem({ code, deviceId })
const check = async (code: string, deviceId: string) => {
  const res = await STATUS(jsonRequest('http://test/api/activation/status', { code, deviceId }))
  return { status: res.status, body: await res.json() }
}
const codeRow = async (code: string) =>
  (await db.query('SELECT * FROM activation_codes WHERE code = $1', [code])).rows[0]

async function paidCode(o: Parameters<typeof transaction>[0] = {}) {
  const txn = transaction(o)
  await sendEvent(transactionEvent(txn))
  const [code] = await codeFor(txn.subscription_id!)
  return { code, txn }
}

describe('POST /api/activation/redeem', () => {
  it('returns the entitlement for a valid code (control)', async () => {
    const { code, txn } = await paidCode({ price_id: 'pri_yearly' })
    expect(await claim(code)).toEqual({
      status: 200,
      body: {
        premium: true,
        status: 'active',
        plan: 'yearly',
        expiresAt: new Date(txn.billing_period!.ends_at).toISOString(),
        activeOnThisDevice: true,
      },
    })
  })

  it('accepts formatted, lowercase and spaced input', async () => {
    const { code } = await paidCode()
    for (const input of [
      code.match(/.{4}/g)!.join('-'),
      code.toLowerCase(),
      ` ${code.slice(0, 6)} ${code.slice(6)} `,
    ])
      expect((await claim(input)).status).toBe(200)
  })

  it('tracks redemptions', async () => {
    const { code } = await paidCode()
    await claim(code)
    const first = (await db.query('SELECT * FROM activation_codes WHERE code = $1', [code])).rows[0]
    await claim(code)
    const second = (await db.query('SELECT * FROM activation_codes WHERE code = $1', [code]))
      .rows[0]
    expect(first.redeem_count).toBe(1)
    expect(second.redeem_count).toBe(2)
    expect(second.first_redeemed_at).toEqual(first.first_redeemed_at)
    expect(second.last_redeemed_at.getTime()).toBeGreaterThanOrEqual(
      first.last_redeemed_at.getTime(),
    )
  })

  it.each([
    ['canceled', false],
    ['past_due', false],
    ['paused', false],
    ['trialing', true],
    ['active', true],
  ])('reflects a %s subscription as premium %s', async (status, premium) => {
    const { code, txn } = await paidCode()
    await sendEvent(subscriptionEvent(txn.subscription_id!, isoIn(1000), { status }))
    expect((await claim(code)).body).toMatchObject({ premium, status })
  })

  it('reflects renewal and reactivation with the same code', async () => {
    const { code, txn } = await paidCode()
    const id = txn.subscription_id!
    await sendEvent(subscriptionEvent(id, isoIn(1000), { status: 'canceled' }))
    expect((await claim(code)).body.premium).toBe(false)
    const next = isoIn(14 * DAY)
    await sendEvent(subscriptionEvent(id, isoIn(2000), { status: 'active', ends_at: next }))
    expect((await claim(code)).body).toMatchObject({
      premium: true,
      expiresAt: new Date(next).toISOString(),
    })
  })

  it('applies the 24 hour grace window after the period ends', async () => {
    expect((await claim((await paidCode({ ends_at: isoIn(-DAY / 2) })).code)).body.premium).toBe(
      true,
    )
    expect((await claim((await paidCode({ ends_at: isoIn(-2 * DAY) })).code)).body.premium).toBe(
      false,
    )
  })

  it.each(['AAAA-BBBB-CCCC', 'ABCD', 'ABCDEFGHJKLMN', ''])(
    'returns 404 for unknown code %j',
    async (code) => {
      expect(await claim(code)).toEqual({ status: 404, body: { error: 'Code not found' } })
    },
  )

  it.each([
    ['non-JSON body', 'not json'],
    ['missing code', {}],
    ['numeric code', { code: 123 }],
    ['null code', { code: null }],
    ['code over 64 chars', { code: 'A'.repeat(65), deviceId: 'd' }],
    ['missing deviceId', { code: 'AAAA-BBBB-CCCC' }],
    ['empty deviceId', { code: 'AAAA-BBBB-CCCC', deviceId: '  ' }],
    ['numeric deviceId', { code: 'AAAA-BBBB-CCCC', deviceId: 1 }],
    ['deviceId over 128 chars', { code: 'AAAA-BBBB-CCCC', deviceId: 'd'.repeat(129) }],
  ])('rejects %s with 400', async (_, body) => {
    expect((await redeem(body)).status).toBe(400)
  })
})

describe('activation code device binding', () => {
  it('status is premium on the device that redeemed (control)', async () => {
    const { code } = await paidCode()
    await claim(code, 'device-a')
    expect(await check(code, 'device-a')).toMatchObject({
      status: 200,
      body: { premium: true, activeOnThisDevice: true },
    })
  })

  it('moves the code to the device that redeemed it last', async () => {
    const { code } = await paidCode()
    await claim(code, 'device-a')
    expect((await claim(code, 'device-b')).body).toMatchObject({
      premium: true,
      activeOnThisDevice: true,
    })
    expect(await check(code, 'device-a')).toMatchObject({
      status: 200,
      body: { premium: false, status: 'active', activeOnThisDevice: false },
    })
    expect((await check(code, 'device-b')).body.premium).toBe(true)

    await claim(code, 'device-a')
    expect((await check(code, 'device-a')).body.premium).toBe(true)
    expect((await check(code, 'device-b')).body.premium).toBe(false)
  })

  it('counts distinct devices, not repeat entries', async () => {
    const { code } = await paidCode()
    for (const device of ['device-a', 'device-a', 'device-b', 'device-a', 'device-c'])
      await claim(code, device)
    const row = await codeRow(code)
    expect(row).toMatchObject({ device_id: 'device-c', device_count: 3, redeem_count: 5 })
    const { rows } = await db.query(
      'SELECT device_id FROM activation_devices WHERE code = $1 ORDER BY device_id',
      [code],
    )
    expect(rows.map((r) => r.device_id)).toEqual(['device-a', 'device-b', 'device-c'])
  })

  it('counts each device once under concurrent redeems', async () => {
    const { code } = await paidCode()
    const devices = ['a', 'b', 'c', 'a', 'b', 'c', 'd', 'd']
    await Promise.all(devices.map((device) => claim(code, device)))
    const row = await codeRow(code)
    expect(row.device_count).toBe(4)
    expect(row.redeem_count).toBe(devices.length)
    expect(devices).toContain(row.device_id)
  })

  it('status never binds or counts', async () => {
    const { code } = await paidCode()
    expect((await check(code, 'device-a')).body).toMatchObject({
      premium: false,
      activeOnThisDevice: false,
    })
    await claim(code, 'device-a')
    await check(code, 'device-b')
    await check(code, 'device-a')
    expect(await codeRow(code)).toMatchObject({
      device_id: 'device-a',
      device_count: 1,
      redeem_count: 1,
    })
  })

  it('status returns 404 for an unknown code and 400 without deviceId', async () => {
    expect((await check('AAAA-BBBB-CCCC', 'device-a')).status).toBe(404)
    const res = await STATUS(
      jsonRequest('http://test/api/activation/status', { code: 'AAAA-BBBB-CCCC' }),
    )
    expect(res.status).toBe(400)
  })
})

describe('POST /api/activation/redeem: rate limit', () => {
  it('returns 429 after 30 requests a minute from one IP, other IPs unaffected', async () => {
    const ip = { 'x-forwarded-for': '203.0.113.7' }
    for (let i = 0; i < 30; i++) expect((await post({}, ip)).status).toBe(400)
    const limited = await post({ code: 'AAAA-BBBB-CCCC', deviceId: 'd' }, ip)
    expect(limited.status).toBe(429)
    expect(Number(limited.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect(
      (await post({ code: 'AAAA-BBBB-CCCC', deviceId: 'd' }, { 'x-forwarded-for': '203.0.113.8' }))
        .status,
    ).toBe(404)
  })
})
