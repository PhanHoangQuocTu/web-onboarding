import type { AvailablePaymentMethod, Paddle, PaddleEventData } from '@paddle/paddle-js'
import type { Plan } from '@/lib/pricing'

export type PaymentMethod = 'card' | 'paypal'
type CheckoutKind = 'express' | 'card' | 'overlay'
export const CARD_CHECKOUT_TARGET = 'paddle-card-checkout-frame'
export const EXPRESS_CHECKOUT_TARGET = 'paddle-express-checkout-frame'

const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim()
const priceIds: Record<Plan, string | undefined> = {
  trial: process.env.NEXT_PUBLIC_PADDLE_PRICE_TRIAL?.trim(),
  weekly: process.env.NEXT_PUBLIC_PADDLE_PRICE_WEEKLY?.trim(),
  yearly: process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY?.trim(),
}
const discountCode = process.env.NEXT_PUBLIC_PADDLE_DISCOUNT_CODE?.trim()

export const isPaddleSandbox = token?.startsWith('test_') ?? false

let paddlePromise: Promise<Paddle> | null = null
let openCheckout: CheckoutKind | null = null
let openOrder: string | null = null
const listeners = new Set<(event: PaddleEventData) => void>()

// Wallet button shown if Paddle neither resizes nor errors by then.
const WALLET_REVEAL_FALLBACK_MS = 8000
export type WalletState = { available?: boolean; ready: boolean }
let wallet: WalletState = { ready: false }
let expressFrame: { loaded: boolean; height?: number; timer?: number } = { loaded: false }
const walletListeners = new Set<() => void>()

function setWallet(next: WalletState) {
  if (next.available === wallet.available && next.ready === wallet.ready) return
  wallet = next
  walletListeners.forEach((listener) => listener())
}

export function subscribeWallet(listener: () => void) {
  walletListeners.add(listener)
  return () => {
    walletListeners.delete(listener)
  }
}

export const getWallet = () => wallet

function resetExpressFrame() {
  clearTimeout(expressFrame.timer)
  expressFrame = { loaded: false }
  setWallet({ ...wallet, ready: false })
}

const revealWallet = () => {
  clearTimeout(expressFrame.timer)
  setWallet({ available: true, ready: true })
}

// Paddle shows a spinner first; the frame resizes once the wallet button renders.
function trackExpressFrame(event: PaddleEventData) {
  if (openCheckout !== 'express') return
  const ping = event as { type?: string; height?: number }
  if (event.name === 'checkout.loaded' && !expressFrame.loaded) {
    expressFrame.loaded = true
    expressFrame.timer = window.setTimeout(revealWallet, WALLET_REVEAL_FALLBACK_MS)
  } else if (expressFrame.loaded && ping.type === 'checkout.ping.size') {
    if (expressFrame.height === undefined) expressFrame.height = ping.height
    else if (ping.height !== expressFrame.height) revealWallet()
  } else if (event.code === 'no_payment_methods_available') {
    // No Apple Pay / Google Pay on this browser (e.g. in-app webviews).
    clearTimeout(expressFrame.timer)
    openCheckout = null
    openOrder = null
    setWallet({ available: false, ready: false })
    void paddlePromise?.then((paddle) => paddle.Checkout.close())
  }
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
        eventCallback: (event) => {
          trackExpressFrame(event)
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

const orderKey = (plan: Plan, discounted: boolean) => `${plan}:${plan === 'yearly' && discounted}`

function planItems(plan: Plan, discounted: boolean) {
  const priceId = priceIds[plan]
  if (!priceId) throw new Error(`Paddle price for the ${plan} plan is not configured.`)
  const withDiscount = plan === 'yearly' && discounted
  if (withDiscount && !discountCode) throw new Error('The yearly discount code is not configured.')
  return {
    items: [{ priceId, quantity: 1 }],
    discountCode: withDiscount ? discountCode : null,
  }
}

function checkoutContext(email: string, sessionId: string) {
  return {
    customer: email.trim() ? { email: email.trim() } : undefined,
    customData: sessionId ? { session_id: sessionId } : undefined,
  }
}

// Updates the items/discount of whichever checkout is open.
export async function syncCheckoutOrder(plan: Plan, discounted: boolean) {
  const key = orderKey(plan, discounted)
  if (!openCheckout || openOrder === key) return
  const order = planItems(plan, discounted)
  openOrder = key
  const paddle = await getPaddle()
  if (openCheckout && openOrder === key) paddle.Checkout.updateCheckout(order)
}

export async function openExpressCheckout({
  plan,
  discounted,
  email,
  sessionId,
}: {
  plan: Plan
  discounted: boolean
  email: string
  sessionId: string
}) {
  if (openCheckout === 'express') return syncCheckoutOrder(plan, discounted)
  if (wallet.available === false) return
  const order = planItems(plan, discounted)
  const paddle = await getPaddle()
  // Another caller may have opened it while Paddle.js was loading.
  if ((openCheckout as CheckoutKind | null) === 'express')
    return syncCheckoutOrder(plan, discounted)
  resetExpressFrame()
  paddle.Checkout.open({
    ...order,
    ...checkoutContext(email, sessionId),
    settings: {
      displayMode: 'inline',
      variant: 'express',
      theme: 'light',
      showNonExpressPaymentMethods: false,
      frameTarget: EXPRESS_CHECKOUT_TARGET,
      frameInitialHeight: 160,
      frameStyle: 'width:100%;min-width:286px;background-color:transparent;border:0;',
    },
  })
  openCheckout = 'express'
  openOrder = orderKey(plan, discounted)
}

export async function openPaddleCheckout({
  plan,
  discounted,
  email,
  sessionId,
  method,
  displayMode = 'overlay',
  signal,
}: {
  plan: Plan
  discounted: boolean
  email: string
  sessionId: string
  method: PaymentMethod
  displayMode?: 'overlay' | 'inline'
  signal?: AbortSignal
}) {
  const order = planItems(plan, discounted)
  const paddle = await getPaddle()
  if (signal?.aborted) return false
  if (method === 'paypal') {
    const preview = await paddle.PricePreview({ items: order.items })
    if (!preview.data.availablePaymentMethods.includes('paypal'))
      throw new Error('PayPal is unavailable for this purchase. Choose another payment method.')
  }
  const allowedPaymentMethods: AvailablePaymentMethod[] = [method]

  if (signal?.aborted) return false

  if (openCheckout === 'express') resetExpressFrame()
  paddle.Checkout.open({
    ...order,
    ...checkoutContext(email, sessionId),
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
  openCheckout = displayMode === 'inline' ? 'card' : 'overlay'
  openOrder = orderKey(plan, discounted)
  return true
}

export async function closePaddleCheckout(kind: CheckoutKind) {
  if (openCheckout !== kind) return
  const paddle = await getPaddle()
  // An express checkout may have replaced it while awaiting.
  if (openCheckout !== kind) return
  if (kind === 'express') resetExpressFrame()
  openCheckout = null
  openOrder = null
  paddle.Checkout.close()
}

export function markOverlayClosed() {
  if (openCheckout !== 'overlay') return
  openCheckout = null
  openOrder = null
}
