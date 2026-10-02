import { withTransaction } from '@/lib/server/db'
import { applyCustomer, applySubscription, applyTransaction } from '@/lib/server/billing'
import {
  verifyPaddleSignature,
  type PaddleCustomer,
  type PaddleEvent,
  type PaddleSubscription,
  type PaddleTransaction,
} from '@/lib/server/paddle'

export async function POST(request: Request) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET?.trim()
  if (!secret) return Response.json({ error: 'Webhook secret is not configured' }, { status: 500 })

  const rawBody = await request.text()
  if (!verifyPaddleSignature(rawBody, request.headers.get('paddle-signature'), secret))
    return Response.json({ error: 'Invalid signature' }, { status: 401 })

  const event = JSON.parse(rawBody) as PaddleEvent
  await withTransaction(async (client) => {
    const { rowCount } = await client.query(
      `INSERT INTO webhook_events (id, event_type, occurred_at) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [event.event_id, event.event_type, event.occurred_at],
    )
    if (!rowCount) return

    if (event.event_type === 'transaction.completed' || event.event_type === 'transaction.paid')
      await applyTransaction(client, event.data as PaddleTransaction)
    else if (event.event_type.startsWith('subscription.'))
      await applySubscription(client, event.data as PaddleSubscription, event.occurred_at)
    else if (event.event_type === 'customer.created' || event.event_type === 'customer.updated')
      await applyCustomer(client, event.data as PaddleCustomer)
  })
  return Response.json({ ok: true })
}
