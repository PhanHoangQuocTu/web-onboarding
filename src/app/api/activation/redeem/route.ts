import { readCodeRequest, redeemCode } from '@/lib/server/billing'
import { rateLimit } from '@/lib/server/rate-limit'

export async function POST(request: Request) {
  const limited = rateLimit(request, 'redeem', 30)
  if (limited) return limited

  const body = await readCodeRequest(request)
  if (!body) return Response.json({ error: 'Invalid code' }, { status: 400 })

  const result = await redeemCode(body.code, body.deviceId)
  if (!result) return Response.json({ error: 'Code not found' }, { status: 404 })
  return Response.json(result)
}
