import type { NextRequest } from 'next/server'
import { db, withTransaction } from '@/lib/server/db'
import {
  applyTransaction,
  entitlement,
  findActivation,
  formatCode,
  isUuid,
} from '@/lib/server/billing'
import { fetchTransaction } from '@/lib/server/paddle'
import { consume, rateLimit } from '@/lib/server/rate-limit'

const TXN_ID = /^txn_[a-z\d]{26}$/
// Paddle allows 240 requests per minute for the whole server IP.
const PADDLE_FALLBACK_PER_MINUTE = 120

const sessionExists = async (id: string) =>
  (await db.query('SELECT 1 FROM quiz_sessions WHERE id = $1', [id])).rowCount! > 0

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, 'activation', 30)
  if (limited) return limited

  const transactionId = request.nextUrl.searchParams.get('transactionId') ?? ''
  const sessionId = request.nextUrl.searchParams.get('sessionId')
  if (!TXN_ID.test(transactionId) || !isUuid(sessionId))
    return Response.json({ error: 'Invalid request' }, { status: 400 })

  let row = await findActivation(transactionId)
  if (
    !row?.code &&
    (await sessionExists(sessionId)) &&
    !consume('paddle-fallback', PADDLE_FALLBACK_PER_MINUTE)
  ) {
    // Webhook not processed yet: verify the transaction with Paddle directly.
    const txn = await fetchTransaction(transactionId)
    if (txn) {
      await withTransaction((client) => applyTransaction(client, txn))
      row = await findActivation(transactionId)
    }
  }
  if (row && row.session_id !== sessionId) row = null
  if (!row) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!row.code || !row.status) return Response.json({ pending: true }, { status: 202 })

  return Response.json({
    code: formatCode(row.code),
    ...entitlement(row.status, row.current_period_end, row.price_id),
  })
}
