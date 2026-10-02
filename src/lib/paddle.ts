import type { AvailablePaymentMethod, Paddle, PaddleEventData } from '@paddle/paddle-js'
import type { Plan } from '@/lib/pricing'

export type PaymentMethod = 'card' | 'paypal' | 'apple_pay' | 'google_pay'
export type WalletMethod = 'apple_pay' | 'google_pay'
export type CheckoutAddress = { countryCode: string; postalCode?: string }
type CheckoutKind = 'card' | 'overlay'
export const CARD_CHECKOUT_TARGET = 'paddle-card-checkout-frame'

const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim()
const priceIds: Record<Plan, string | undefined> = {
  trial: process.env.NEXT_PUBLIC_PADDLE_PRICE_TRIAL?.trim(),
  weekly: process.env.NEXT_PUBLIC_PADDLE_PRICE_WEEKLY?.trim(),
  yearly: process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY?.trim(),
}

export const isPaddleSandbox = token?.startsWith('test_') ?? false

// Paddle's `uses_postal_code` countries; checkout can't skip its details page there without a ZIP.
export const POSTAL_CODE_COUNTRIES = new Set([
  'AU',
  'CA',
  'DE',
  'ES',
  'FR',
  'GB',
  'IN',
  'IT',
  'NL',
  'US',
])
let countryPromise: Promise<string | null> | null = null

let paddlePromise: Promise<Paddle> | null = null
let openCheckout: CheckoutKind | null = null
const listeners = new Set<(event: PaddleEventData) => void>()

const methodNames: Record<Exclude<PaymentMethod, 'card'>, string> = {
  paypal: 'PayPal',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
}

export function deviceWallet(): WalletMethod | null {
  const session = (window as { ApplePaySession?: { canMakePayments(): boolean } }).ApplePaySession
  try {
    if (session?.canMakePayments()) return 'apple_pay'
  } catch {
    /* canMakePayments throws on insecure origins. */
  }
  // Paddle offers Google Pay only in Chrome; in-app WebViews report "Android WebView" instead.
  const { userAgentData } = navigator as { userAgentData?: { brands: { brand: string }[] } }
  return userAgentData?.brands.some((b) => b.brand === 'Google Chrome') ? 'google_pay' : null
}

export function subscribePaddleEvents(listener: (event: PaddleEventData) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function planFromPriceId(priceId: string | undefined) {
  return (Object.keys(priceIds) as Plan[]).find((plan) => priceIds[plan] === priceId) ?? null
}

async function getPaddle() {
  if (!token || (!token.startsWith('test_') && !token.startsWith('live_')))
    throw new Error('Paddle client token is not configured.')

  if (!paddlePromise) {
    paddlePromise = import('@paddle/paddle-js').then(async ({ initializePaddle }) => {
      const paddle = await initializePaddle({
        token,
        environment: isPaddleSandbox ? 'sandbox' : 'production',
        eventCallback: (event) => listeners.forEach((listener) => listener(event)),
      })
      if (!paddle) throw new Error('Paddle checkout could not be initialized.')
      return paddle
    })
    paddlePromise.catch(() => {
      paddlePromise = null
    })
  }

  return paddlePromise
}

function planItems(plan: Plan) {
  const priceId = priceIds[plan]
  if (!priceId) throw new Error(`Paddle price for the ${plan} plan is not configured.`)
  return [{ priceId, quantity: 1 }]
}

async function discountedTransaction(sessionId: string, signal?: AbortSignal) {
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
    signal,
  })
  const body = (await response.json().catch(() => null)) as { transactionId?: string } | null
  if (!response.ok || !body?.transactionId)
    throw new Error('The yearly discount could not be applied. Please try again.')
  return body.transactionId
}

function checkoutContext(email: string, sessionId: string, address?: CheckoutAddress) {
  return {
    customer: email.trim() ? { email: email.trim(), address } : undefined,
    customData: sessionId ? { session_id: sessionId } : undefined,
  }
}

// Paddle geolocates the visitor's IP when PricePreview has no address. Resolves null on failure.
export function detectCountry() {
  const priceId = Object.values(priceIds).find(Boolean)
  if (!priceId) return Promise.resolve(null)
  countryPromise ??= getPaddle()
    .then((paddle) => paddle.PricePreview({ items: [{ priceId, quantity: 1 }] }))
    .then((preview) => preview.data.address?.countryCode ?? null)
    .catch(() => {
      countryPromise = null
      return null
    })
  return countryPromise
}

export async function openPaddleCheckout({
  plan,
  discounted,
  email,
  sessionId,
  method,
  displayMode = 'overlay',
  address,
  signal,
}: {
  plan: Plan
  discounted: boolean
  email: string
  sessionId: string
  method: PaymentMethod
  displayMode?: 'overlay' | 'inline'
  address?: CheckoutAddress
  signal?: AbortSignal
}) {
  const items = planItems(plan)
  const withDiscount = plan === 'yearly' && discounted
  const [paddle, transactionId] = await Promise.all([
    getPaddle().then(async (paddle) => {
      if (method === 'card') return paddle
      const preview = await paddle.PricePreview({ items, address })
      if (!preview.data.availablePaymentMethods.includes(method))
        throw new Error(
          `${methodNames[method]} is unavailable for this purchase. Choose another payment method.`,
        )
      return paddle
    }),
    withDiscount ? discountedTransaction(sessionId, signal) : null,
  ])
  const allowedPaymentMethods: AvailablePaymentMethod[] = [method]

  if (signal?.aborted) return false

  // The server-created transaction already carries the session in custom_data.
  const context = checkoutContext(email, sessionId, address)
  paddle.Checkout.open({
    ...(transactionId ? { transactionId, customer: context.customer } : { items, ...context }),
    settings: {
      displayMode,
      // Multi-page skips the email/country page when they are prefilled.
      variant: 'multi-page',
      theme: 'light',
      allowedPaymentMethods,
      allowDiscountRemoval: plan !== 'yearly',
      ...(displayMode === 'inline'
        ? {
            frameTarget: CARD_CHECKOUT_TARGET,
            frameInitialHeight: 360,
            frameStyle: 'width:100%;min-width:286px;background-color:transparent;border:0;',
          }
        : {}),
    },
  })
  openCheckout = displayMode === 'inline' ? 'card' : 'overlay'
  return true
}

export async function closePaddleCheckout(kind: CheckoutKind) {
  if (openCheckout !== kind) return
  const paddle = await getPaddle()
  // Another checkout may have replaced it while awaiting.
  if (openCheckout !== kind) return
  openCheckout = null
  paddle.Checkout.close()
}

export function markOverlayClosed() {
  if (openCheckout !== 'overlay') return
  openCheckout = null
}
