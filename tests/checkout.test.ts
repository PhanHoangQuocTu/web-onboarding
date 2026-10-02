import { describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/checkout/route'
import { jsonRequest, randomUUID } from './helpers'

const create = (body: unknown, headers?: Record<string, string>) =>
  POST(jsonRequest('http://test/api/checkout', body, headers))

const configure = () => {
  vi.stubEnv('PADDLE_API_KEY', 'key_123')
  vi.stubEnv('PADDLE_DISCOUNT_ID', 'dsc_yearly')
  vi.stubEnv('NEXT_PUBLIC_PADDLE_CLIENT_TOKEN', 'test_abc')
}

const mockPaddle = (response: Response) => {
  const fn = vi.fn(async () => response)
  vi.stubGlobal('fetch', fn)
  return fn
}

describe('POST /api/checkout', () => {
  it('creates a discounted yearly transaction for the session (control)', async () => {
    configure()
    const fn = mockPaddle(Response.json({ data: { id: 'txn_1' } }, { status: 201 }))
    const sessionId = randomUUID()
    const res = await create({ sessionId })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ transactionId: 'txn_1' })

    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://sandbox-api.paddle.com/transactions')
    expect(init.method).toBe('POST')
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer key_123')
    expect(JSON.parse(init.body as string)).toEqual({
      items: [{ price_id: 'pri_yearly', quantity: 1 }],
      discount_id: 'dsc_yearly',
      custom_data: { session_id: sessionId },
    })
  })

  it.each([
    ['non-JSON body', 'not json'],
    ['missing session', {}],
    ['bad session', { sessionId: 'nope' }],
  ])('rejects %s with 400 without calling Paddle', async (_, body) => {
    configure()
    const fn = mockPaddle(Response.json({ data: { id: 'txn_1' } }))
    expect((await create(body)).status).toBe(400)
    expect(fn).not.toHaveBeenCalled()
  })

  it.each(['PADDLE_API_KEY', 'PADDLE_DISCOUNT_ID'])('returns 503 without %s', async (name) => {
    configure()
    vi.stubEnv(name, '')
    const fn = mockPaddle(Response.json({ data: { id: 'txn_1' } }))
    expect((await create({ sessionId: randomUUID() })).status).toBe(503)
    expect(fn).not.toHaveBeenCalled()
  })

  it('returns 502 when Paddle rejects the transaction', async () => {
    configure()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockPaddle(Response.json({ error: {} }, { status: 400 }))
    expect((await create({ sessionId: randomUUID() })).status).toBe(502)
  })

  it('returns 429 after 20 requests a minute from one IP', async () => {
    configure()
    mockPaddle(Response.json({ data: { id: 'txn_1' } }))
    const ip = { 'x-forwarded-for': '203.0.113.30' }
    for (let i = 0; i < 20; i++) expect((await create({}, ip)).status).toBe(400)
    expect((await create({ sessionId: randomUUID() }, ip)).status).toBe(429)
  })
})
