'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TemplateArt } from '@/components/Art'
import { useFlow } from '@/components/FlowProvider'
import { trackEvent } from '@/lib/gtag'
import {
  CARD_CHECKOUT_TARGET,
  closeInlinePaddleCheckout,
  isPaddleSandbox,
  openPaddleCheckout,
  subscribePaddleEvents,
} from '@/lib/paddle'
import { makePlan, skill, subject } from '@/lib/plan'
import { price } from '@/lib/pricing'
import { GA_EVENT, GA_PARAM } from '@/utils/const'

function formatCheckoutTotal(total: number, currency: string) {
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency })
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2
  return formatter.format(total / 10 ** digits)
}

export function CheckoutSheet({ onClose, error }: { onClose: () => void; error: string | null }) {
  const { answers, plan, email } = useFlow()
  const heading = useRef<HTMLHeadingElement>(null)
  const [loading, setLoading] = useState(true)
  const [localError, setLocalError] = useState<string | null>(null)
  const [checkoutTotal, setCheckoutTotal] = useState<string | null>(null)

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  useEffect(() => {
    const controller = new AbortController()
    const unsubscribe = subscribePaddleEvents((event) => {
      if ((event.name === 'checkout.loaded' || event.name === 'checkout.updated') && event.data) {
        setCheckoutTotal(formatCheckoutTotal(event.data.totals.total, event.data.currency_code))
        setLoading(false)
      }
    })

    void openPaddleCheckout({
      plan,
      email,
      method: 'card',
      displayMode: 'inline',
      signal: controller.signal,
    })
      .then((opened) => {
        if (!opened || controller.signal.aborted) return
        setLoading(false)
        trackEvent(GA_EVENT.BEGIN_CHECKOUT, { [GA_PARAM.PLAN]: plan, [GA_PARAM.METHOD]: 'card' })
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setLoading(false)
        setLocalError(
          cause instanceof Error ? cause.message : 'Secure card checkout could not load.',
        )
      })

    return () => {
      controller.abort()
      unsubscribe()
      void closeInlinePaddleCheckout()
    }
  }, [plan, email])

  const planKeys = makePlan(answers)
    .filter((key) => key !== 'photo')
    .slice(0, 3)
  const cost = price(plan)
  const title =
    plan === 'trial' ? '3-Day Trial' : plan === 'yearly' ? 'Yearly plan · 50% off' : 'Weekly plan'

  const dialog = (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#231f33]/45 md:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        className="flex h-[75dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[28px] bg-[#f4f2f7] shadow-2xl md:rounded-[28px]"
      >
        <div className="shrink-0 py-3" aria-hidden="true">
          <div className="mx-auto h-1.5 w-14 rounded-full bg-[#d3ccdf]" />
        </div>
        <div
          className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-3 pb-[calc(20px+env(safe-area-inset-bottom))] sm:px-5"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <h3 id="checkout-title" ref={heading} tabIndex={-1} className="text-xl font-bold">
            {title}
          </h3>

          <div className="surface mt-4 flex items-center gap-3 rounded-[20px] p-3">
            <div className="flex shrink-0">
              {planKeys.map((key, i) => (
                <TemplateArt
                  key={`${key}-${i}`}
                  name={key}
                  className={`size-9 border-2 border-white ${i ? '-ml-2.5' : ''}`}
                />
              ))}
            </div>
            <span className="min-w-0">
              <b className="block text-sm leading-snug text-[#231f33]">
                Your 7-day {subject(answers).t} plan
              </b>
              <small className="block text-xs text-[#5f5a72]">
                Made for {skill(answers).t.toLowerCase()}
              </small>
            </span>
          </div>

          <div className="mt-4 rounded-[20px] bg-[#ece8f2] p-4">
            <div className="flex items-baseline justify-between gap-2 font-semibold">
              <span>Due today</span>
              <b className="brand-font text-2xl text-[#231f33]">{checkoutTotal ?? cost.today}</b>
            </div>
            <small className="mt-1 block text-sm leading-snug text-[#5f5a72]">
              {plan === 'yearly' && '50% off the first year · '}
              {cost.next}
            </small>
          </div>

          <h4 className="mt-4 text-sm font-bold text-[#231f33]">Email and card information</h4>
          <div className="relative mt-2 min-h-[520px] w-full rounded-xl bg-white">
            {loading && (
              <p
                role="status"
                className="absolute inset-x-0 top-8 text-center text-sm text-[#5f5a72]"
              >
                Loading secure card form…
              </p>
            )}
            <div className={CARD_CHECKOUT_TARGET} />
          </div>
          {(localError || error) && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {localError || error}
            </p>
          )}

          <p className="mt-3 text-center text-xs text-[#5f5a72]">
            <span aria-hidden="true">🔒 </span>
            {isPaddleSandbox
              ? 'Secure Paddle sandbox checkout. No live charge.'
              : 'Secure checkout with Paddle.'}
          </p>
          <p className="mt-3 text-center text-xs leading-relaxed text-[#5f5a72]">
            Renews automatically until you cancel. Cancel anytime before the renewal date.
          </p>
          <button
            type="button"
            onClick={() => {
              trackEvent(GA_EVENT.CHECKOUT_DISMISS, { [GA_PARAM.PLAN]: plan })
              onClose()
            }}
            className="mt-2 min-h-11 w-full text-sm font-semibold text-[#4a36ae] underline underline-offset-4"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document === 'undefined' ? null : createPortal(dialog, document.body)
}
