import 'server-only'
import { randomBytes } from 'node:crypto'
import type { PoolClient } from 'pg'
import { db } from './db'
import type { PaddleCustomer, PaddleSubscription, PaddleTransaction } from './paddle'

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 12
const PREMIUM_STATUSES = new Set(['active', 'trialing'])
const EXPIRY_GRACE_MS = 24 * 60 * 60 * 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID.test(value)

const sessionFrom = (data: Record<string, unknown> | null) => {
  const id = data?.session_id
  return isUuid(id) ? id : null
}

export function generateCode() {
  // 32 symbols divide 256 evenly, so masking with 31 keeps the distribution uniform.
  return [...randomBytes(CODE_LENGTH)].map((byte) => CODE_ALPHABET[byte & 31]).join('')
}

export const normalizeCode = (input: string) => input.toUpperCase().replace(/[^A-Z0-9]/g, '')

export const formatCode = (code: string) => code.match(/.{1,4}/g)?.join('-') ?? code

const planByPrice = () =>
  new Map(
    (
      [
        ['trial', process.env.NEXT_PUBLIC_PADDLE_PRICE_TRIAL],
        ['weekly', process.env.NEXT_PUBLIC_PADDLE_PRICE_WEEKLY],
        ['yearly', process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY],
      ] as const
    )
      .filter(([, id]) => id?.trim())
      .map(([plan, id]) => [id!.trim(), plan]),
  )

export function entitlement(status: string, periodEnd: Date | null, priceId: string | null) {
  const premium =
    PREMIUM_STATUSES.has(status) &&
    (!periodEnd || periodEnd.getTime() + EXPIRY_GRACE_MS > Date.now())
  return {
    premium,
    status,
    plan: (priceId && planByPrice().get(priceId)) || null,
    expiresAt: periodEnd?.toISOString() ?? null,
  }
}

async function issueCode(client: PoolClient, subscriptionId: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await client.query(
      'INSERT INTO activation_codes (code, subscription_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [generateCode(), subscriptionId],
    )
    const { rows } = await client.query<{ code: string }>(
      'SELECT code FROM activation_codes WHERE subscription_id = $1',
      [subscriptionId],
    )
    if (rows[0]) return rows[0].code
  }
  throw new Error(`Could not issue an activation code for ${subscriptionId}`)
}

export async function applyTransaction(client: PoolClient, txn: PaddleTransaction) {
  const sessionId = sessionFrom(txn.custom_data)
  await client.query(
    `INSERT INTO transactions (id, subscription_id, customer_id, session_id, status, total, currency)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       subscription_id = COALESCE(transactions.subscription_id, EXCLUDED.subscription_id),
       session_id = COALESCE(transactions.session_id, EXCLUDED.session_id)`,
    [
      txn.id,
      txn.subscription_id,
      txn.customer_id,
      sessionId,
      txn.status,
      txn.details?.totals?.total ?? null,
      txn.details?.totals?.currency_code ?? txn.currency_code ?? null,
    ],
  )
  const paid = txn.status === 'paid' || txn.status === 'completed'
  if (!paid || !txn.subscription_id) return null

  // Provisional row until a subscription.* webhook brings the authoritative state.
  await client.query(
    `INSERT INTO subscriptions (id, customer_id, session_id, status, price_id, current_period_end)
     VALUES ($1, $2, $3, 'active', $4, $5)
     ON CONFLICT (id) DO UPDATE SET
       session_id = COALESCE(subscriptions.session_id, EXCLUDED.session_id)`,
    [
      txn.subscription_id,
      txn.customer_id,
      sessionId,
      txn.items[0]?.price?.id ?? null,
      txn.billing_period?.ends_at ?? null,
    ],
  )
  return issueCode(client, txn.subscription_id)
}

export async function applySubscription(
  client: PoolClient,
  sub: PaddleSubscription,
  occurredAt: string,
) {
  const sessionId = sessionFrom(sub.custom_data)
  await client.query(
    `INSERT INTO subscriptions
       (id, customer_id, session_id, status, price_id, current_period_end, canceled_at, last_event_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
       customer_id = EXCLUDED.customer_id,
       session_id = COALESCE(subscriptions.session_id, EXCLUDED.session_id),
       status = EXCLUDED.status,
       price_id = COALESCE(EXCLUDED.price_id, subscriptions.price_id),
       current_period_end = COALESCE(EXCLUDED.current_period_end, subscriptions.current_period_end),
       canceled_at = EXCLUDED.canceled_at,
       last_event_at = EXCLUDED.last_event_at,
       updated_at = now()
     WHERE subscriptions.last_event_at IS NULL OR subscriptions.last_event_at <= EXCLUDED.last_event_at`,
    [
      sub.id,
      sub.customer_id,
      sessionId,
      sub.status,
      sub.items[0]?.price?.id ?? null,
      sub.current_billing_period?.ends_at ?? null,
      sub.canceled_at,
      occurredAt,
    ],
  )
}

export async function applyCustomer(client: PoolClient, customer: PaddleCustomer) {
  await client.query(
    `INSERT INTO paddle_customers (id, email) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now()`,
    [customer.id, customer.email],
  )
}

type ActivationRow = {
  session_id: string | null
  code: string | null
  status: string | null
  current_period_end: Date | null
  price_id: string | null
}

export async function findActivation(transactionId: string): Promise<ActivationRow | null> {
  const { rows } = await db.query<ActivationRow>(
    `SELECT t.session_id, c.code, s.status, s.current_period_end, s.price_id
     FROM transactions t
     LEFT JOIN subscriptions s ON s.id = t.subscription_id
     LEFT JOIN activation_codes c ON c.subscription_id = t.subscription_id
     WHERE t.id = $1`,
    [transactionId],
  )
  return rows[0] ?? null
}

export async function redeemCode(input: string) {
  const code = normalizeCode(input)
  if (code.length !== CODE_LENGTH) return null
  const { rows } = await db.query<{
    status: string
    current_period_end: Date | null
    price_id: string | null
  }>(
    `WITH hit AS (
       UPDATE activation_codes SET
         redeem_count = redeem_count + 1,
         first_redeemed_at = COALESCE(first_redeemed_at, now()),
         last_redeemed_at = now()
       WHERE code = $1
       RETURNING subscription_id
     )
     SELECT s.status, s.current_period_end, s.price_id
     FROM hit JOIN subscriptions s ON s.id = hit.subscription_id`,
    [code],
  )
  const row = rows[0]
  return row ? entitlement(row.status, row.current_period_end, row.price_id) : null
}
