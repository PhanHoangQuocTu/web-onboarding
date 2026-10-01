import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { fetchTransaction, verifyPaddleSignature } from '@/lib/server/paddle'

const SECRET = 'pdl_ntfset_test'
const NOW = 1_800_000_000
const body = '{"event_id":"evt_1"}'
const h1 = (ts: number, payload = body, secret = SECRET) =>
  createHmac('sha256', secret).update(`${ts}:${payload}`).digest('hex')

describe('verifyPaddleSignature', () => {
  it('accepts a valid signature (control)', () => {
    expect(verifyPaddleSignature(body, `ts=${NOW};h1=${h1(NOW)}`, SECRET, NOW)).toBe(true)
  })

  it('accepts timestamps within 5 seconds and rejects beyond', () => {
    for (const offset of [-5, 5])
      expect(
        verifyPaddleSignature(body, `ts=${NOW + offset};h1=${h1(NOW + offset)}`, SECRET, NOW),
      ).toBe(true)
    for (const offset of [-6, 6, 3600])
      expect(
        verifyPaddleSignature(body, `ts=${NOW + offset};h1=${h1(NOW + offset)}`, SECRET, NOW),
      ).toBe(false)
  })

  it('rejects a tampered body, wrong secret, or signature for another timestamp', () => {
    const header = `ts=${NOW};h1=${h1(NOW)}`
    expect(verifyPaddleSignature(body + ' ', header, SECRET, NOW)).toBe(false)
    expect(verifyPaddleSignature(body, header, 'other', NOW)).toBe(false)
    expect(verifyPaddleSignature(body, `ts=${NOW};h1=${h1(NOW - 1)}`, SECRET, NOW)).toBe(false)
  })

  it('accepts any matching h1 during secret rotation', () => {
    const header = `ts=${NOW};h1=${h1(NOW, body, 'old')};h1=${h1(NOW)}`
    expect(verifyPaddleSignature(body, header, SECRET, NOW)).toBe(true)
  })

  it.each([
    null,
    '',
    `h1=${h1(NOW)}`,
    `ts=${NOW}`,
    `ts;h1=${h1(NOW)}`,
    `ts=abc;h1=${h1(NOW)}`,
    `ts=${NOW};h1=zz`,
    `ts=${NOW};h1=${h1(NOW).slice(0, 10)}`,
    `ts=${NOW};h1=`,
  ])('rejects malformed header %s', (header) => {
    expect(verifyPaddleSignature(body, header, SECRET, NOW)).toBe(false)
  })
})

describe('fetchTransaction', () => {
  const txn = { id: 'txn_1', status: 'completed' }
  const mockFetch = (response: Response) => {
    const fn = vi.fn(async () => response)
    vi.stubGlobal('fetch', fn)
    return fn
  }

  it('does not call Paddle without an API key', async () => {
    const fn = mockFetch(Response.json({ data: txn }))
    expect(await fetchTransaction('txn_1')).toBeNull()
    expect(fn).not.toHaveBeenCalled()
  })

  it('calls the sandbox API for test_ client tokens', async () => {
    vi.stubEnv('PADDLE_API_KEY', 'key_123')
    vi.stubEnv('NEXT_PUBLIC_PADDLE_CLIENT_TOKEN', 'test_abc')
    const fn = mockFetch(Response.json({ data: txn }))
    expect(await fetchTransaction('txn_1')).toEqual(txn)
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://sandbox-api.paddle.com/transactions/txn_1')
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer key_123')
  })

  it('calls the live API for live_ client tokens', async () => {
    vi.stubEnv('PADDLE_API_KEY', 'key_123')
    vi.stubEnv('NEXT_PUBLIC_PADDLE_CLIENT_TOKEN', 'live_abc')
    const fn = mockFetch(Response.json({ data: txn }))
    await fetchTransaction('txn_1')
    expect((fn.mock.calls[0] as unknown as [string])[0]).toBe(
      'https://api.paddle.com/transactions/txn_1',
    )
  })

  it('returns null on 404 and throws on other errors', async () => {
    vi.stubEnv('PADDLE_API_KEY', 'key_123')
    mockFetch(Response.json({}, { status: 404 }))
    expect(await fetchTransaction('txn_1')).toBeNull()
    mockFetch(Response.json({}, { status: 500 }))
    await expect(fetchTransaction('txn_1')).rejects.toThrow('500')
  })
})
