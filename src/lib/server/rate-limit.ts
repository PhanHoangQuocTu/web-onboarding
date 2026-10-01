import 'server-only'

const WINDOW_MS = 60_000
const MAX_KEYS = 50_000
const buckets = new Map<string, { count: number; resetAt: number }>()

// Next fills x-forwarded-for with the socket address only when the header is absent.
export const clientIp = (request: Request) =>
  request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() || 'unknown'

/** Counts a hit for `key` and returns the seconds to wait, or 0 when allowed. */
export function consume(key: string, limit: number) {
  const now = Date.now()
  if (buckets.size >= MAX_KEYS) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
    if (buckets.size >= MAX_KEYS) buckets.clear()
  }
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return 0
  }
  bucket.count++
  return bucket.count > limit ? Math.ceil((bucket.resetAt - now) / 1000) : 0
}

export function rateLimit(request: Request, scope: string, limitPerMinute: number) {
  const wait = consume(`${scope}:${clientIp(request)}`, limitPerMinute)
  return wait
    ? Response.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(wait) } },
      )
    : null
}

export const resetRateLimits = () => buckets.clear()
