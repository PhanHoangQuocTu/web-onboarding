import { getAnalytics, isSupported, logEvent, setUserId, type Analytics } from 'firebase/analytics'
import { getFirebaseApp } from '@/lib/firebase'
import { FIREBASE_CONFIG, type GA_EVENT, type GA_PARAM } from '@/utils/const'
import type { Plan } from '@/lib/pricing'
import { gaScreenName, stepIndex } from '@/lib/quiz'

export type GaEvent = (typeof GA_EVENT)[keyof typeof GA_EVENT]
type GaParam = (typeof GA_PARAM)[keyof typeof GA_PARAM]
type GaItem = { item_id: string; item_name: string; price: number; quantity: number }
type GtagParams = Partial<Record<GaParam, string | number | boolean | GaItem[]>>
const PLAN_NAME: Record<Plan, string> = { trial: '3-Day Trial', weekly: 'Weekly', yearly: 'Yearly' }
let userId: string | undefined
let currentStep = ''

// Firebase Analytics is GA4: it loads gtag.js itself and ships events to the linked GA4 property.
// One promise keeps init lazy (client only) and preserves call order for events fired before it resolves.
let analytics: Promise<Analytics | null> | undefined

function getAnalyticsInstance() {
  if (typeof window === 'undefined' || !FIREBASE_CONFIG.measurementId) return null
  analytics ??= isSupported()
    .then((ok) => (ok ? getAnalytics(getFirebaseApp()) : null))
    .catch(() => null)
  return analytics
}

// Every event carries the funnel step it happened on (the app is a single page).
export function setGaStep(step: string) {
  currentStep = step
}

const slug = (part: string) =>
  part
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

/** Unique key for one clickable thing: `<step>.<element>[.<value>]`. */
export function clickId(element: string, value?: string | number) {
  return [
    currentStep && gaScreenName(currentStep),
    element,
    value === undefined ? '' : slug(String(value)),
  ]
    .filter(Boolean)
    .join('.')
}

/**
 * Params that identify a click; spread into the event alongside its own params.
 * `detail` (e.g. the plan on screen) extends the key into `click_detail`, so one button
 * can be reported alone (click_id) or per plan (click_detail).
 */
export function clickParams(element: string, value?: string | number, detail?: string) {
  const id = clickId(element, value)
  return {
    click_id: id,
    click_detail: detail ? `${id}.${slug(detail)}` : id,
    element,
  } satisfies GtagParams
}

export function trackEvent(name: GaEvent, params: GtagParams = {}) {
  const step = typeof params.screen_name === 'string' ? params.screen_name : currentStep
  const payload = {
    ...(step ? { step_index: stepIndex(step) } : {}),
    ...params,
    ...(step ? { screen_name: gaScreenName(step) } : {}),
  }
  void getAnalyticsInstance()?.then((a) => a && logEvent(a, name as string, payload))
}

export function setGaUser(id: string) {
  if (!id || id === userId) return
  userId = id
  void getAnalyticsInstance()?.then((a) => a && setUserId(a, id))
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
