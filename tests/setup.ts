import { afterEach, inject, vi } from 'vitest'
import { resetRateLimits } from '@/lib/server/rate-limit'

Object.assign(process.env, inject('pgEnv'))
process.env.PADDLE_WEBHOOK_SECRET = 'pdl_ntfset_test'
process.env.NEXT_PUBLIC_PADDLE_PRICE_TRIAL = 'pri_trial'
process.env.NEXT_PUBLIC_PADDLE_PRICE_WEEKLY = 'pri_weekly'
process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY = 'pri_yearly'
delete process.env.PADDLE_API_KEY
delete process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  resetRateLimits()
})
