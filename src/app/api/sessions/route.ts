import { db } from '@/lib/server/db'
import { isUuid } from '@/lib/server/billing'
import { isValidEmail } from '@/lib/email'
import { rateLimit } from '@/lib/server/rate-limit'

const PLANS = new Set(['trial', 'weekly', 'yearly'])
const MAX_ANSWERS_BYTES = 8 * 1024

export async function POST(request: Request) {
  const limited = rateLimit(request, 'sessions', 30)
  if (limited) return limited

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const { id, answers, email, plan, step } = body ?? {}
  const answersJson = JSON.stringify(answers ?? {})
  if (
    !isUuid(id) ||
    !answers ||
    typeof answers !== 'object' ||
    Array.isArray(answers) ||
    answersJson.length > MAX_ANSWERS_BYTES ||
    (email !== undefined && (typeof email !== 'string' || (email && !isValidEmail(email)))) ||
    (plan !== undefined && !PLANS.has(plan as string)) ||
    (step !== undefined && (typeof step !== 'string' || step.length > 32))
  )
    return Response.json({ error: 'Invalid session' }, { status: 400 })

  await db.query(
    `INSERT INTO quiz_sessions (id, answers, email, plan, step) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET
       answers = EXCLUDED.answers,
       email = COALESCE(EXCLUDED.email, quiz_sessions.email),
       plan = COALESCE(EXCLUDED.plan, quiz_sessions.plan),
       step = COALESCE(EXCLUDED.step, quiz_sessions.step),
       updated_at = now()`,
    [id, answersJson, (email as string | undefined)?.trim() || null, plan ?? null, step ?? null],
  )
  return Response.json({ ok: true })
}
