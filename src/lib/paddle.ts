import type { AvailablePaymentMethod, Paddle, PaddleEventData } from '@paddle/paddle-js'
import type { Plan } from '@/lib/pricing'

export type PaymentMethod = 'card' | 'google_pay' | 'apple_pay' | 'paypal'
export const CARD_CHECKOUT_TARGET = 'paddle-card-checkout-frame'

const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim()
const priceIds: Record<Plan, string | undefined> = {
  trial: process.env.NEXT_PUBLIC_PADDLE_PRICE_TRIAL?.trim(),
  weekly: process.env.NEXT_PUBLIC_PADDLE_PRICE_WEEKLY?.trim(),
  yearly: process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY?.trim(),
}
const discountCode = process.env.NEXT_PUBLIC_PADDLE_DISCOUNT_CODE?.trim()

export const isPaddleSandbox = token?.startsWith('test_') ?? false

let paddlePromise: Promise<Paddle> | null = null
let inlineCheckoutOpen = false
const listeners = new Set<(event: PaddleEventData) => void>()

export function subscribePaddleEvents(listener: (event: PaddleEventData) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

async function getPaddle() {
  if (!token || (!token.startsWith('test_') && !token.startsWith('live_')))
    throw new Error('Paddle client token is not configured.')

  if (!paddlePromise) {
    paddlePromise = import('@paddle/paddle-js').then(async ({ initializePaddle }) => {
      const paddle = await initializePaddle({
        token,
        environment: isPaddleSandbox ? 'sandbox' : 'production',
        checkout: {
          settings: {
            frameTarget: CARD_CHECKOUT_TARGET,
            frameInitialHeight: 520,
            frameStyle: 'width:100%;min-width:286px;background-color:transparent;border:0;',
          },
        },
        eventCallback: (event) => {
          listeners.forEach((listener) => listener(event))
        },
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

export async function openPaddleCheckout({
  plan,
  email,
  method,
  displayMode = 'overlay',
  signal,
}: {
  plan: Plan
  email: string
  method: PaymentMethod
  displayMode?: 'overlay' | 'inline'
  signal?: AbortSignal
}) {
  const priceId = priceIds[plan]
  if (!priceId) throw new Error(`Paddle price for the ${plan} plan is not configured.`)
  if (plan === 'yearly' && !discountCode)
    throw new Error('The yearly discount code is not configured.')

  const paddle = await getPaddle()
  if (signal?.aborted) return false
  if (method !== 'card') {
    const preview = await paddle.PricePreview({ items: [{ priceId, quantity: 1 }] })
    if (!preview.data.availablePaymentMethods.includes(method)) {
      const name = { google_pay: 'Google Pay', apple_pay: 'Apple Pay', paypal: 'PayPal' }[method]
      throw new Error(`${name} is unavailable for this purchase. Choose another payment method.`)
    }
  }
  const allowedPaymentMethods: AvailablePaymentMethod[] = [method]

  if (signal?.aborted) return false
  paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: email.trim() ? { email: email.trim() } : undefined,
    discountCode: plan === 'yearly' ? discountCode : undefined,
    settings: {
      displayMode,
      variant: 'one-page',
      theme: 'light',
      allowedPaymentMethods,
      allowDiscountRemoval: plan !== 'yearly',
      ...(displayMode === 'inline'
        ? {
            frameTarget: CARD_CHECKOUT_TARGET,
            frameInitialHeight: 520,
            frameStyle: 'width:100%;min-width:286px;background-color:transparent;border:0;',
          }
        : {}),
    },
  })
  inlineCheckoutOpen = displayMode === 'inline'
  return true
}

export async function closeInlinePaddleCheckout() {
  if (!inlineCheckoutOpen) return
  inlineCheckoutOpen = false
  const paddle = await getPaddle()
  paddle.Checkout.close()
}
