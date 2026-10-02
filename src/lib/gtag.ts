import { GA_ID, type GA_EVENT, type GA_PARAM } from '@/utils/const'
import type { Plan } from '@/lib/pricing'

export type GaEvent = (typeof GA_EVENT)[keyof typeof GA_EVENT]
type GaParam = (typeof GA_PARAM)[keyof typeof GA_PARAM]
type GaItem = { item_id: string; item_name: string; price: number; quantity: number }
type GtagParams = Partial<Record<GaParam, string | number | boolean | GaItem[]>>
declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

const PLAN_NAME: Record<Plan, string> = { trial: '3-Day Trial', weekly: 'Weekly', yearly: 'Yearly' }
let userId: string | undefined

function gtag(...args: unknown[]) {
  if (typeof window === 'undefined' || !GA_ID) return
  if (!window.gtag) {
    const dataLayer = (window.dataLayer = window.dataLayer || [])
    window.gtag = function () {
      // gtag.js ignores arrays; it only reads Arguments objects.
      // oxlint-disable-next-line prefer-rest-params
      dataLayer.push(arguments)
    }
    window.gtag('js', new Date())
    window.gtag('config', GA_ID, userId ? { user_id: userId } : {})
  }
  window.gtag(...args)
}

export function trackEvent(name: GaEvent, params: GtagParams = {}) {
  gtag('event', name, params)
}

export function setGaUser(id: string) {
  if (!id || id === userId) return
  userId = id
  if (typeof window !== 'undefined' && window.gtag) window.gtag('set', { user_id: id })
}

// Paddle reports 'apple-pay'; our own methods use 'apple_pay'.
export const gaMethod = (method: string) => method.replaceAll('-', '_')

const round2 = (n: number) => Math.round(n * 100) / 100

export function gaItems(plan: Plan, value: number): GaItem[] {
  return [{ item_id: plan, item_name: PLAN_NAME[plan], price: value, quantity: 1 }]
}

export function purchaseParams(
  plan: Plan,
  transactionId: string,
  currency: string,
  totals: { total: number; tax: number },
) {
  const value = round2(totals.total - totals.tax)
  return {
    plan,
    transaction_id: transactionId,
    currency,
    value,
    tax: round2(totals.tax),
    items: gaItems(plan, value),
  } satisfies GtagParams
}
