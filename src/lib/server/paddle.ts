import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

export type PaddleTransaction = {
  id: string
  status: string
  customer_id: string | null
  subscription_id: string | null
  custom_data: Record<string, unknown> | null
  items: { price: { id: string } | null }[]
  billing_period: { starts_at: string; ends_at: string } | null
  details?: { totals?: { total?: string; currency_code?: string } } | null
  currency_code?: string
}

export type PaddleSubscription = {
  id: string
  status: string
  customer_id: string
  custom_data: Record<string, unknown> | null
  items: { price: { id: string } | null }[]
  current_billing_period: { starts_at: string; ends_at: string } | null
  canceled_at: string | null
}

export type PaddleCustomer = { id: string; email: string | null }

export type PaddleEvent = {
  event_id: string
  event_type: string
  occurred_at: string
  data: unknown
}

const TOLERANCE_SECONDS = 5

export function verifyPaddleSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  if (!header) return false
  let ts = ''
  const signatures: string[] = []
  for (const part of header.split(';')) {
    const [key, value] = part.split('=', 2)
    if (key === 'ts') ts = value ?? ''
    if (key === 'h1' && value) signatures.push(value)
  }
  const timestamp = Number(ts)
  if (!Number.isInteger(timestamp) || !signatures.length) return false
  if (Math.abs(nowSeconds - timestamp) > TOLERANCE_SECONDS) return false

  const expected = createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest()
  return signatures.some((signature) => {
    const received = Buffer.from(signature, 'hex')
    return received.length === expected.length && timingSafeEqual(received, expected)
  })
}

const apiBase = () =>
  process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim().startsWith('test_')
    ? 'https://sandbox-api.paddle.com'
    : 'https://api.paddle.com'

export async function fetchTransaction(id: string): Promise<PaddleTransaction | null> {
  const key = process.env.PADDLE_API_KEY?.trim()
  if (!key) return null
  const response = await fetch(`${apiBase()}/transactions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Paddle GET /transactions failed: ${response.status}`)
  const body = (await response.json()) as { data: PaddleTransaction }
  return body.data
}

export async function createTransaction(
  priceId: string,
  discountId: string,
  sessionId: string,
): Promise<string> {
  const key = process.env.PADDLE_API_KEY?.trim()
  if (!key) throw new Error('PADDLE_API_KEY is not configured')
  const response = await fetch(`${apiBase()}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ price_id: priceId, quantity: 1 }],
      discount_id: discountId,
      custom_data: { session_id: sessionId },
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) throw new Error(`Paddle POST /transactions failed: ${response.status}`)
  const body = (await response.json()) as { data: { id: string } }
  return body.data.id
}
