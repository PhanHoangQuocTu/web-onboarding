import { isUuid } from '@/lib/server/billing'
import { createTransaction } from '@/lib/server/paddle'
import { rateLimit } from '@/lib/server/rate-limit'

// Creates the discounted yearly transaction server-side so the discount never needs a code.
export async function POST(request: Request) {
  const limited = rateLimit(request, 'checkout', 20)
  if (limited) return limited

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const sessionId = body?.sessionId
  if (!isUuid(sessionId)) return Response.json({ error: 'Invalid session' }, { status: 400 })

  const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY?.trim()
  const discountId = process.env.PADDLE_DISCOUNT_ID?.trim()
  if (!priceId || !discountId || !process.env.PADDLE_API_KEY?.trim())
    return Response.json({ error: 'Checkout is not configured' }, { status: 503 })

  try {
    const transactionId = await createTransaction(priceId, discountId, sessionId)
    return Response.json({ transactionId })
  } catch (error) {
    console.error('Discounted checkout failed', error)
    return Response.json({ error: 'Checkout could not be created' }, { status: 502 })
  }
}
