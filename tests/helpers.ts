import { createHmac, randomUUID } from 'node:crypto'
import { db } from '@/lib/server/db'
import { POST as webhook } from '@/app/api/paddle/webhook/route'
import type { PaddleTransaction } from '@/lib/server/paddle'

export const SECRET = 'pdl_ntfset_test'

const alnum = 'abcdefghijklmnopqrstuvwxyz0123456789'
export const paddleId = (prefix: string) =>
  `${prefix}_${[...crypto.getRandomValues(new Uint8Array(26))].map((b) => alnum[b % 36]).join('')}`

export { randomUUID }

export const sign = (body: string, { ts = Math.floor(Date.now() / 1000), secret = SECRET } = {}) =>
  `ts=${ts};h1=${createHmac('sha256', secret).update(`${ts}:${body}`).digest('hex')}`

export function webhookRequest(event: object, signature?: string | null) {
  const body = JSON.stringify(event)
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const header = signature === undefined ? sign(body) : signature
  if (header !== null) headers.set('Paddle-Signature', header)
  return new Request('http://test/api/paddle/webhook', { method: 'POST', headers, body })
}

export const sendEvent = (event: object) => webhook(webhookRequest(event))

export const isoIn = (ms: number) => new Date(Date.now() + ms).toISOString()
export const DAY = 864e5

type TxnOverrides = Partial<{
  id: string
  status: string
  subscription_id: string | null
  customer_id: string
  session_id: string | null
  price_id: string
  ends_at: string | null
}>

export function transaction(o: TxnOverrides = {}) {
  return {
    id: o.id ?? paddleId('txn'),
    status: o.status ?? 'completed',
    customer_id: o.customer_id ?? paddleId('ctm'),
    subscription_id: o.subscription_id === undefined ? paddleId('sub') : o.subscription_id,
    custom_data: o.session_id === null ? null : { session_id: o.session_id ?? randomUUID() },
    items: [{ price: { id: o.price_id ?? 'pri_weekly' } }],
    billing_period:
      o.ends_at === null ? null : { starts_at: isoIn(0), ends_at: o.ends_at ?? isoIn(7 * DAY) },
    details: { totals: { total: '699', currency_code: 'USD' } },
    currency_code: 'USD',
  }
}

export function transactionEvent(txn: PaddleTransaction, type = 'transaction.completed') {
  return { event_id: paddleId('evt'), event_type: type, occurred_at: isoIn(0), data: txn }
}

type SubOverrides = Partial<{
  status: string
  ends_at: string | null
  price_id: string
  canceled_at: string | null
  session_id: string
  customer_id: string
}>

export function subscriptionEvent(id: string, occurredAt: string, o: SubOverrides = {}) {
  return {
    event_id: paddleId('evt'),
    event_type: 'subscription.updated',
    occurred_at: occurredAt,
    data: {
      id,
      status: 'status' in o ? o.status : 'active',
      customer_id: o.customer_id ?? paddleId('ctm'),
      custom_data: o.session_id ? { session_id: o.session_id } : null,
      items: [{ price: { id: o.price_id ?? 'pri_weekly' } }],
      current_billing_period:
        o.ends_at === null ? null : { starts_at: isoIn(0), ends_at: o.ends_at ?? isoIn(7 * DAY) },
      canceled_at: o.canceled_at ?? null,
    },
  }
}

export async function codeFor(subscriptionId: string) {
  const { rows } = await db.query<{ code: string }>(
    'SELECT code FROM activation_codes WHERE subscription_id = $1',
    [subscriptionId],
  )
  return rows.map((row) => row.code)
}

export const jsonRequest = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

export const saveSession = (id: string) =>
  db.query("INSERT INTO quiz_sessions (id, answers) VALUES ($1, '{}') ON CONFLICT DO NOTHING", [id])
