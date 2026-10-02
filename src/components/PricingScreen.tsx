'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useFlow } from '@/components/FlowProvider'
import { CheckoutSheet } from '@/components/CheckoutSheet'
import { CheckIcon } from '@/components/CheckIcon'
import { OfferCountdown } from '@/components/OfferCountdown'
import { PaymentActions } from '@/components/PaymentActions'
import { Laurel } from '@/components/Laurel'
import { PricingDetails, ValuePanel } from '@/components/PricingDetails'
import {
  clickParams,
  gaItems,
  gaMethod,
  purchaseParams,
  trackEvent,
  type GaEvent,
} from '@/lib/gtag'
import {
  closePaddleCheckout,
  detectCountry,
  deviceWallet,
  markOverlayClosed,
  openPaddleCheckout,
  planFromPriceId,
  subscribePaddleEvents,
  syncCheckoutOrder,
  type PaymentMethod,
  type WalletMethod,
} from '@/lib/paddle'
import { subject } from '@/lib/plan'
import {
  amountDueToday,
  isDiscounted,
  money,
  price,
  TRIAL,
  WEEK,
  YEARLY_SAVING_PCT,
  yearlyPrice,
  type Plan,
} from '@/lib/pricing'
import { GA_ELEMENT, GA_CURRENCY, GA_EVENT, GA_PARAM, GA_VALUE } from '@/utils/const'

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

const walletClickEvents: Record<WalletMethod, GaEvent> = {
  apple_pay: GA_EVENT.PAY_APPLE_PAY_CLICK,
  google_pay: GA_EVENT.PAY_GOOGLE_PAY_CLICK,
}

function trackPaymentError(errorType: string, plan: Plan, method?: string | null) {
  trackEvent(GA_EVENT.PAYMENT_ERROR, {
    [GA_PARAM.PLAN]: plan,
    [GA_PARAM.ERROR_TYPE]: errorType.slice(0, 100),
    ...(method ? { [GA_PARAM.METHOD]: gaMethod(method) } : {}),
  })
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
  const [wallet, setWallet] = useState<WalletMethod | null>(null)
  const payRef = useRef<HTMLDivElement>(null)
  const [barGone, setBarGone] = useState(offerExpired)
  const [pastPay, setPastPay] = useState(false)
  const planRef = useRef<Plan>(plan)
  const discountedRef = useRef(discounted)
  const completedTransaction = useRef<string | null>(null)
  const overlayMethod = useRef<PaymentMethod | null>(null)
  const expiryTracked = useRef(offerExpired)
  const closeSheet = useCallback(() => setSheet(false), [])
  const expireOffer = useCallback(() => {
    if (!expiryTracked.current) {
      expiryTracked.current = true
      trackEvent(GA_EVENT.OFFER_EXPIRED, { [GA_PARAM.PLAN]: planRef.current })
    }
    setOfferExpired(true)
  }, [])
  const hideBar = useCallback(() => setBarGone(true), [])
  const hasBar = !barGone
  useEffect(() => {
    if (!ready) return
    const sync = () => {
      const bottom = payRef.current?.getBoundingClientRect().bottom
      setPastPay(bottom !== undefined && bottom < (hasBar ? 80 : 12))
    }
    sync()
    window.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      window.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [ready, hasBar])
  useEffect(() => {
    planRef.current = plan
    discountedRef.current = discounted
  }, [plan, discounted])
  useEffect(() => {
    if (!ready) return
    startOfferTimer()
    // ApplePaySession only exists in the browser.
    // oxlint-disable-next-line react/set-state-in-effect
    setWallet(deviceWallet())
    // Warms the checkout's country prefill.
    void detectCountry()
  }, [ready, startOfferTimer])
  // Drops the discount from the card form or PayPal overlay when the timer runs out.
  useEffect(() => {
    if (sheet || overlay) void syncCheckoutOrder(plan, discounted).catch(() => {})
  }, [sheet, overlay, plan, discounted])
  useEffect(
    () =>
      subscribePaddleEvents((event) => {
        const eventPlan = planFromPriceId(event.data?.items?.[0]?.price_id) ?? planRef.current
        const failedMethod = () =>
          event.data?.payment?.method_details?.type ?? overlayMethod.current
        if (event.name === 'checkout.payment.initiated') {
          const method = event.data?.payment.method_details.type ?? 'card'
          trackEvent(GA_EVENT.PAY_SUBMIT_CLICK, {
            ...clickParams(GA_ELEMENT.CHECKOUT, `submit_${gaMethod(method)}`, eventPlan),
            [GA_PARAM.PLAN]: eventPlan,
            [GA_PARAM.CURRENCY]: GA_CURRENCY,
            [GA_PARAM.VALUE]: amountDueToday(eventPlan, discountedRef.current),
            [GA_PARAM.METHOD]: gaMethod(method),
            [GA_PARAM.DISCOUNTED]: isDiscounted(eventPlan, discountedRef.current),
          })
        }
        if (event.name === 'checkout.completed' && event.data) {
          const transactionId = event.data.transaction_id
          if (!transactionId || completedTransaction.current === transactionId) return
          completedTransaction.current = transactionId
          const purchasedPlan = eventPlan
          const paid = event.data.totals.total
          trackEvent(GA_EVENT.PURCHASE, {
            ...purchaseParams(
              purchasedPlan,
              transactionId,
              event.data.currency_code,
              event.data.totals,
            ),
            [GA_PARAM.METHOD]: gaMethod(event.data.payment.method_details.type),
            [GA_PARAM.DISCOUNTED]: event.data.totals.discount > 0,
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
        // The wallet isn't set up on this device (e.g. in-app browsers); hide its button.
        if (event.code === 'no_payment_methods_available') {
          trackPaymentError(event.code, eventPlan, overlayMethod.current)
          overlayMethod.current = null
          void closePaddleCheckout('overlay')
          setOverlay(false)
          setWallet(null)
          setCheckoutError('This payment method is unavailable on this device. Choose another one.')
          return
        }
        if (event.name === 'checkout.error' || event.name === 'checkout.payment.error') {
          trackPaymentError(event.code || event.name, eventPlan, failedMethod())
          setCheckoutError(event.detail || 'Payment could not be completed. Please try again.')
        }
        if (event.name === 'checkout.failed') {
          trackPaymentError(event.name, eventPlan, failedMethod())
          setCheckoutError('Payment could not be completed. Please try again.')
        }
        if (event.name === 'checkout.closed' && event.data?.settings?.display_mode !== 'inline') {
          // Skips closes after a purchase or our own close above.
          if (overlayMethod.current && !completedTransaction.current)
            trackEvent(GA_EVENT.CHECKOUT_OVERLAY_CLOSED, {
              ...clickParams(GA_ELEMENT.CHECKOUT, 'overlay_closed', eventPlan),
              [GA_PARAM.PLAN]: eventPlan,
              [GA_PARAM.METHOD]: overlayMethod.current,
            })
          overlayMethod.current = null
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
    [GA_PARAM.DISCOUNTED]: isDiscounted(plan, discounted),
  }
  const scrollToPlans = (source: string) => {
    trackEvent(GA_EVENT.CHOOSE_PLAN_CLICK, {
      ...clickParams(GA_ELEMENT.CHOOSE_PLAN, source, plan),
      [GA_PARAM.PLAN]: plan,
      [GA_PARAM.SOURCE]: source,
    })
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }
  const showFab = pastPay && !hasBar
  const startCheckout = async (method: PaymentMethod) => {
    if (busy) return
    setCheckoutError(null)
    setBusy(true)
    try {
      const country = await detectCountry()
      const address = country ? { countryCode: country } : undefined
      await openPaddleCheckout({ plan, discounted, email, sessionId, method, address })
      trackEvent(GA_EVENT.BEGIN_CHECKOUT, {
        ...payParams,
        [GA_PARAM.METHOD]: method,
        [GA_PARAM.ITEMS]: gaItems(plan, amountDueToday(plan, discounted)),
      })
      overlayMethod.current = method
      setOverlay(true)
      setSheet(false)
    } catch (error) {
      trackPaymentError('checkout_open_failed', plan, method)
      setCheckoutError(error instanceof Error ? error.message : 'Paddle checkout could not open.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className={`flex flex-col gap-6 ${hasBar ? 'pt-20' : 'pt-4'}`}>
      {hasBar && (
        <OfferCountdown
          expiresAt={offerExpiresAt}
          onExpire={expireOffer}
          onGone={hideBar}
          showGo={pastPay}
          onGo={() => scrollToPlans(GA_VALUE.COUNTDOWN)}
        />
      )}
      {createPortal(
        <button
          type="button"
          aria-hidden={!showFab}
          tabIndex={showFab ? 0 : -1}
          onClick={() => scrollToPlans(GA_VALUE.FAB)}
          className={`brand-font fixed left-1/2 top-[calc(16px+env(safe-area-inset-top,0px))] z-30 inline-flex h-11 items-center gap-2 rounded-full bg-(--primary) pl-3.5 pr-[18px] text-base font-semibold text-white shadow-[0_8px_20px_rgba(35,31,51,0.22)] transition-[opacity,transform] duration-200 hover:bg-(--primary-hover) ${showFab ? 'pointer-events-auto -translate-x-1/2 translate-y-0 opacity-100' : 'pointer-events-none -translate-x-1/2 -translate-y-2 opacity-0'}`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          Get my plan
        </button>,
        document.body,
      )}
      <h2>
        Draw <span className="text-(--accent-text)">{subject(answers).pro}</span> in 7 days
      </h2>

      <ValuePanel />

      <div className="flex flex-col gap-4" role="radiogroup" aria-label="Choose a plan">
        {planOptions(discounted).map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={plan === item.id}
            onClick={() => {
              if (plan !== item.id)
                trackEvent(GA_EVENT.SELECT_PLAN, {
                  ...clickParams(GA_ELEMENT.PLAN, item.id),
                  [GA_PARAM.FROM_PLAN]: plan,
                  [GA_PARAM.PLAN]: item.id,
                  [GA_PARAM.CURRENCY]: GA_CURRENCY,
                  [GA_PARAM.VALUE]: amountDueToday(item.id, discounted),
                  [GA_PARAM.DISCOUNTED]: isDiscounted(item.id, discounted),
                })
              setPlan(item.id)
            }}
            className="plan-card surface relative flex w-full items-center gap-4 rounded-[28px] p-4 text-left"
          >
            <span className="radio" aria-hidden="true">
              <CheckIcon />
            </span>
            <span className="flex min-w-0 flex-1 flex-col leading-[1.3]">
              <b className="brand-font text-xl font-bold text-(--ink)">{item.title}</b>
              <small className="text-base text-(--muted)">{item.description}</small>
            </span>
            <span className="brand-font flex flex-col items-end text-2xl leading-[1.1] font-bold tracking-[-0.035em] text-(--ink) tabular-nums">
              {item.cost}
              <small className="text-sm font-semibold tracking-normal text-(--muted)">
                {item.period}
              </small>
            </span>
            {item.id === 'yearly' && (
              <em className="brand-font absolute -top-3 right-4 rounded-full bg-(--primary) px-2.5 py-[3px] text-sm font-semibold not-italic text-white">
                {discounted ? '50% off' : `Save ${YEARLY_SAVING_PCT}%`}
              </em>
            )}
          </button>
        ))}
      </div>
      <div ref={payRef} className="flex flex-col gap-4">
        <PaymentActions
          busy={busy}
          wallet={wallet}
          onWalletClick={(method) => {
            trackEvent(walletClickEvents[method], {
              ...clickParams(GA_ELEMENT.PAY, method, plan),
              [GA_PARAM.METHOD]: method,
              ...payParams,
            })
            void startCheckout(method)
          }}
          onPayPalClick={() => {
            trackEvent(GA_EVENT.PAY_PAYPAL_CLICK, {
              ...clickParams(GA_ELEMENT.PAY, 'paypal', plan),
              [GA_PARAM.METHOD]: 'paypal',
              ...payParams,
            })
            void startCheckout('paypal')
          }}
          onCardClick={() => {
            trackEvent(GA_EVENT.PAY_CARD_CLICK, {
              ...clickParams(GA_ELEMENT.PAY, 'card', plan),
              [GA_PARAM.METHOD]: 'card',
              ...payParams,
            })
            setCheckoutError(null)
            setSheet(true)
          }}
        />
        {checkoutError && (
          <p role="alert" className="text-center text-sm text-red-700">
            {checkoutError}
          </p>
        )}
        <p className="text-center text-sm leading-[1.45] text-(--muted)">
          Due today {amount.today}. {plan === 'yearly' && discounted && '50% off the first year · '}
          {amount.next}.
        </p>
      </div>
      <p className="flex items-center justify-center gap-2 text-center text-base font-semibold text-(--ink)">
        <span className="grid size-5.5 place-items-center rounded-full bg-(--accent) text-white">
          <CheckIcon />
        </span>
        Cancel anytime
      </p>
      <div className="mt-6 grid grid-cols-2 gap-2">
        {[
          ['1,000+', 'templates'],
          ['100K+', 'downloads'],
          ['4.6', 'on Google Play'],
          ['5,000+', 'positive reviews'],
        ].map(([value, label]) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 rounded-3xl bg-(--surface-2) px-2 py-[18px] last:odd:col-span-2"
          >
            <b className="brand-font inline-flex items-center gap-1 text-2xl leading-none font-bold tracking-[-0.035em] text-(--ink)">
              {value === '5,000+' && <Laurel side="left" />}
              {value}
              {value === '5,000+' && <Laurel side="right" />}
              {value === '4.6' && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  className="text-[#F2B134]"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"
                  />
                </svg>
              )}
            </b>
            <span className="text-sm leading-none text-(--muted)">{label}</span>
          </div>
        ))}
      </div>
      <PricingDetails />
      {sheet && (
        <CheckoutSheet onClose={closeSheet} error={checkoutError} discounted={discounted} />
      )}
    </div>
  )
}
