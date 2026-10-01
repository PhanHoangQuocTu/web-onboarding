import { redeemCode } from '@/lib/server/billing'
import { rateLimit } from '@/lib/server/rate-limit'

export async function POST(request: Request) {
  const limited = rateLimit(request, 'redeem', 30)
  if (limited) return limited

  const body = (await request.json().catch(() => null)) as { code?: unknown } | null
  if (typeof body?.code !== 'string' || body.code.length > 64)
    return Response.json({ error: 'Invalid code' }, { status: 400 })

  const result = await redeemCode(body.code)
  if (!result) return Response.json({ error: 'Code not found' }, { status: 404 })
  return Response.json(result)
}
