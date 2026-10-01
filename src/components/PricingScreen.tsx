'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useFlow } from '@/components/FlowProvider'
import { CheckoutSheet } from '@/components/CheckoutSheet'
import { CheckIcon } from '@/components/CheckIcon'
import { OfferCountdown } from '@/components/OfferCountdown'
import { PaymentActions } from '@/components/PaymentActions'
import { PricingDetails, ValuePanel } from '@/components/PricingDetails'
import { trackEvent, type GaEvent } from '@/lib/gtag'
import {
  markOverlayClosed,
  openExpressCheckout,
  openPaddleCheckout,
  planFromPriceId,
  subscribePaddleEvents,
  syncCheckoutOrder,
  type PaymentMethod,
} from '@/lib/paddle'
import { subject } from '@/lib/plan'
import {
  amountDueToday,
  money,
  price,
  TRIAL,
  WEEK,
  YEARLY_SAVING_PCT,
  yearlyPrice,
  type Plan,
} from '@/lib/pricing'
import { GA_CURRENCY, GA_EVENT, GA_PARAM } from '@/utils/const'

const planOptions = (discounted: boolean) =>
  [
    {
      id: 'trial',
      title: '3-Day Trial',
      description: `Then ${money(WEEK)} a week`,
      cost: money(TRIAL),
      period: 'for 3 days',
    },
    {
      id: 'weekly',
      title: 'Weekly',
      description: 'Billed every week',
      cost: money(WEEK),
      period: '/week',
    },
    {
      id: 'yearly',
      title: 'Yearly',
      description: `${money(yearlyPrice(discounted) / 52)} a week`,
      cost: money(yearlyPrice(discounted)),
      period: '/year',
    },
  ] as const

const walletClickEvents: Record<string, GaEvent | undefined> = {
  'apple-pay': GA_EVENT.PAY_APPLE_PAY_CLICK,
  'google-pay': GA_EVENT.PAY_GOOGLE_PAY_CLICK,
}

export function PricingScreen() {
  const {
    answers,
    plan,
    setPlan,
    email,
    sessionId,
    setReceipt,
    go,
    ready,
    offerExpiresAt,
    startOfferTimer,
  } = useFlow()
  const [offerExpired, setOfferExpired] = useState(
    () => offerExpiresAt !== undefined && offerExpiresAt <= Date.now(),
  )
  const discounted = !offerExpired
  const [sheet, setSheet] = useState(false)
  const [overlay, setOverlay] = useState(false)
  const [busy, setBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const plansRef = useRef<HTMLDivElement>(null)
  const planRef = useRef<Plan>(plan)
  const discountedRef = useRef(discounted)
  const completedTransaction = useRef<string | null>(null)
  const closeSheet = useCallback(() => setSheet(false), [])
  const expireOffer = useCallback(() => setOfferExpired(true), [])
  useEffect(() => {
    planRef.current = plan
    discountedRef.current = discounted
  }, [plan, discounted])
  useEffect(() => {
    if (ready) startOfferTimer()
  }, [ready, startOfferTimer])
  useEffect(() => {
    if (!ready || sheet || overlay) return
    openExpressCheckout({ plan, discounted, email, sessionId }).catch((error: unknown) => {
      setCheckoutError(error instanceof Error ? error.message : 'Paddle checkout could not load.')
    })
  }, [ready, sheet, overlay, plan, discounted, email, sessionId])
  // Drops the discount from the card form or PayPal overlay when the timer runs out.
  useEffect(() => {
    if (sheet || overlay) void syncCheckoutOrder(plan, discounted).catch(() => {})
  }, [sheet, overlay, plan, discounted])
  useEffect(
    () =>
      subscribePaddleEvents((event) => {
        const eventPlan = planFromPriceId(event.data?.items?.[0]?.price_id) ?? planRef.current
        if (event.name === 'checkout.payment.initiated') {
          const method = event.data?.payment.method_details.type ?? 'card'
          const params = {
            [GA_PARAM.PLAN]: eventPlan,
            [GA_PARAM.CURRENCY]: GA_CURRENCY,
            [GA_PARAM.VALUE]: amountDueToday(eventPlan, discountedRef.current),
          }
          const walletEvent = walletClickEvents[method]
          if (walletEvent) {
            trackEvent(walletEvent, params)
            trackEvent(GA_EVENT.BEGIN_CHECKOUT, { ...params, [GA_PARAM.METHOD]: method })
          }
          trackEvent(GA_EVENT.PAY_SUBMIT_CLICK, { ...params, [GA_PARAM.METHOD]: method })
        }
        if (event.name === 'checkout.completed' && event.data) {
          const transactionId = event.data.transaction_id
          if (!transactionId || completedTransaction.current === transactionId) return
          completedTransaction.current = transactionId
          const purchasedPlan = eventPlan
          const paid = event.data.totals.total
          trackEvent(GA_EVENT.PADDLE_CHECKOUT_COMPLETE, {
            [GA_PARAM.PLAN]: purchasedPlan,
            [GA_PARAM.TRANSACTION_ID]: transactionId,
            [GA_PARAM.CURRENCY]: event.data.currency_code,
            [GA_PARAM.VALUE]: paid,
          })
          setReceipt({
            plan: purchasedPlan,
            transactionId,
            method: event.data.payment.method_details.type,
            paidToday: new Intl.NumberFormat('en', {
              style: 'currency',
              currency: event.data.currency_code,
            }).format(paid),
          })
          setSheet(false)
          go('complete')
        }
        // Handled in paddle.ts by hiding the wallet button.
        if (event.code === 'no_payment_methods_available') return
        if (event.name === 'checkout.error' || event.name === 'checkout.payment.error') {
          setCheckoutError(event.detail || 'Payment could not be completed. Please try again.')
        }
        if (event.name === 'checkout.failed') {
          setCheckoutError('Payment could not be completed. Please try again.')
        }
        if (event.name === 'checkout.closed' && event.data?.settings?.display_mode !== 'inline') {
          markOverlayClosed()
          setOverlay(false)
        }
      }),
    [go, setReceipt],
  )
  if (!ready) return null
  const amount = price(plan, discounted)
  const payParams = {
    [GA_PARAM.PLAN]: plan,
    [GA_PARAM.CURRENCY]: GA_CURRENCY,
    [GA_PARAM.VALUE]: amountDueToday(plan, discounted),
  }
  const scrollToPlans = () =>
    plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const startCheckout = async (method: PaymentMethod) => {
    if (busy) return
    setCheckoutError(null)
    setBusy(true)
    try {
      await openPaddleCheckout({ plan, discounted, email, sessionId, method })
      trackEvent(GA_EVENT.BEGIN_CHECKOUT, { ...payParams, [GA_PARAM.METHOD]: method })
      setOverlay(true)
      setSheet(false)
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Paddle checkout could not open.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <OfferCountdown expiresAt={offerExpiresAt} onExpire={expireOffer} />
      {/* <p className="brand-font mb-3 text-sm font-semibold uppercase tracking-wider text-[#4a36ae]">
        {forKids(answers) ? 'Made for your child' : 'Made for you'}
      </p> */}
      <div className="px-6">
        <h2>
          Draw <span className="text-[#4a36ae]">{subject(answers).pro}</span> in 7 days
        </h2>
      </div>
      {/* <div className="mt-5 grid grid-cols-7 gap-1.5">
        {keys.map((key, i) => (
          <TemplateArt name={key} key={`${key}-${i}`} className="w-full" />
        ))}
      </div> */}

      <ValuePanel />

      <div ref={plansRef} className="mt-6 space-y-3" role="radiogroup" aria-label="Choose a plan">
        {planOptions(discounted).map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={plan === item.id}
            onClick={() => {
              if (plan !== item.id)
                trackEvent(GA_EVENT.SELECT_PLAN, {
                  [GA_PARAM.PLAN]: item.id,
                  [GA_PARAM.CURRENCY]: GA_CURRENCY,
                  [GA_PARAM.VALUE]: amountDueToday(item.id, discounted),
                })
              setPlan(item.id)
            }}
            className="answer-card surface relative flex w-full items-center gap-3.5 rounded-[28px] px-5 py-4 text-left"
          >
            <span className="radio" aria-hidden="true">
              <CheckIcon />
            </span>
            <span className="min-w-0 flex-1">
              <b className="brand-font block text-xl text-[#231f33]">{item.title}</b>

              <small className="block text-base text-[#5f5a72]">{item.description}</small>
            </span>

            <span className="brand-font text-right text-2xl font-bold text-[#231f33] tabular-nums">
              {item.cost}
              <small className="block text-sm font-semibold text-[#5f5a72]">{item.period}</small>
            </span>

            {item.id === 'yearly' && (
              <em className="brand-font absolute -top-2.5 right-5 rounded-full bg-[#2e2750] px-2.5 py-0.5 text-sm font-semibold not-italic text-white">
                {discounted ? '50% off' : `Save ${YEARLY_SAVING_PCT}%`}
              </em>
            )}
          </button>
        ))}
      </div>
      <PaymentActions
        busy={busy}
        onPayPalClick={() => {
          trackEvent(GA_EVENT.PAY_PAYPAL_CLICK, payParams)
          void startCheckout('paypal')
        }}
        onCardClick={() => {
          setCheckoutError(null)
          setSheet(true)
        }}
      />
      {checkoutError && (
        <p role="alert" className="mt-3 text-center text-sm text-red-700">
          {checkoutError}
        </p>
      )}
      <div className="mt-3 ">
        <p className="text-center text-sm text-[#5f5a72]">
          Due today {amount.today}. {plan === 'yearly' && discounted && '50% off the first year.'}
        </p>
        <p className="text-center text-sm text-[#5f5a72]">{amount.next}.</p>
      </div>
      <p className="mt-4 flex items-center justify-center gap-2 text-center text-base font-semibold text-[#231f33]">
        <span className="grid size-5.5 place-items-center rounded-full bg-[#5b45c8] text-white">
          <CheckIcon />
        </span>
        Cancel anytime
      </p>
      <div className="mt-6 grid grid-cols-3 gap-2">
        {[
          ['100K+', 'downloads'],
          ['1,000+', 'templates'],
          ['4.6', 'Google Play'],
        ].map(([value, label]) => (
          <div
            key={label}
            className="flex min-w-0 flex-col items-center rounded-3xl bg-[#ece8f2] px-1 py-4 min-[380px]:px-2"
          >
            <b className="brand-font text-xl text-[#231f33] min-[380px]:text-2xl">{value}</b>
            <small className="text-center text-xs text-[#5f5a72] min-[380px]:text-sm">
              {label}
            </small>
          </div>
        ))}
      </div>
      <PricingDetails onChoose={scrollToPlans} />
      {sheet && (
        <CheckoutSheet onClose={closeSheet} error={checkoutError} discounted={discounted} />
      )}
    </>
  )
}
