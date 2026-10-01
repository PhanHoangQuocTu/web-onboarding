'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TemplateArt } from '@/components/Art'
import { useFlow } from '@/components/FlowProvider'
import { trackEvent } from '@/lib/gtag'
import { isValidEmail } from '@/lib/email'
import {
  CARD_CHECKOUT_TARGET,
  closePaddleCheckout,
  detectCountry,
  isPaddleSandbox,
  openPaddleCheckout,
  POSTAL_CODE_COUNTRIES,
  subscribePaddleEvents,
} from '@/lib/paddle'
import { makePlan, skill, subject } from '@/lib/plan'
import { price } from '@/lib/pricing'
import { GA_EVENT, GA_PARAM } from '@/utils/const'

// Paddle.js event totals are already in major units (e.g. 6.99).
function formatCheckoutTotal(total: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(total)
}

export function CheckoutSheet({
  onClose,
  error,
  discounted,
}: {
  onClose: () => void
  error: string | null
  discounted: boolean
}) {
  const { answers, plan, email, setEmail, sessionId } = useFlow()
  const heading = useRef<HTMLHeadingElement>(null)
  // Later discount changes are applied via syncCheckoutOrder, not by reopening the form.
  const discountedAtOpen = useRef(discounted)
  const tracked = useRef(false)
  const [loading, setLoading] = useState(true)
  const [localError, setLocalError] = useState<string | null>(null)
  const [checkoutTotal, setCheckoutTotal] = useState<string | null>(null)
  const [emailDraft, setEmailDraft] = useState(email)
  const [zipDraft, setZipDraft] = useState('')
  const [zip, setZip] = useState('')
  // undefined while Paddle is still geolocating the visitor.
  const [country, setCountry] = useState<string | null>()
  const needsZip = !!country && POSTAL_CODE_COUNTRIES.has(country)
  const emailInvalid = !!emailDraft.trim() && !isValidEmail(emailDraft)
  const canOpen = country !== undefined && isValidEmail(email) && (!needsZip || !!zip)

  useEffect(() => {
    void detectCountry().then(setCountry)
  }, [])

  // Committing reopens the Paddle form, so it only happens on blur/submit, not per keystroke.
  const commitDetails = () => {
    if (isValidEmail(emailDraft) && emailDraft.trim() !== email) setEmail(emailDraft.trim())
    setZip(zipDraft.trim())
  }

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
    if (!canOpen) return
    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    const controller = new AbortController()
    const unsubscribe = subscribePaddleEvents((event) => {
      if ((event.name === 'checkout.loaded' || event.name === 'checkout.updated') && event.data) {
        setCheckoutTotal(formatCheckoutTotal(event.data.totals.total, event.data.currency_code))
        setLoading(false)
      }
    })

    void openPaddleCheckout({
      plan,
      discounted: discountedAtOpen.current,
      email,
      sessionId,
      method: 'card',
      displayMode: 'inline',
      address: country ? { countryCode: country, postalCode: zip || undefined } : undefined,
      signal: controller.signal,
    })
      .then((opened) => {
        if (!opened || controller.signal.aborted) return
        setLoading(false)
        if (tracked.current) return
        tracked.current = true
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
      void closePaddleCheckout('card')
    }
  }, [canOpen, plan, email, sessionId, country, zip])

  const planKeys = makePlan(answers)
    .filter((key) => key !== 'photo')
    .slice(0, 3)
  const cost = price(plan, discounted)
  const title =
    plan === 'trial'
      ? '3-Day Trial'
      : plan === 'yearly'
        ? `Yearly plan${discounted ? ' · 50% off' : ''}`
        : 'Weekly plan'

  const dialog = (
    <div
      className="sheet-veil fixed inset-0 z-50 flex items-end justify-center bg-[rgba(35,31,51,0.42)] md:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        className="sheet-up flex h-[75dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[40px] bg-(--ground) md:rounded-[40px]"
      >
        <div className="shrink-0 pb-4 pt-3" aria-hidden="true">
          <div className="mx-auto h-1 w-10 rounded-sm bg-(--line)" />
        </div>
        <div
          className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-6 pb-[calc(20px+env(safe-area-inset-bottom))]"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <h3
            id="checkout-title"
            ref={heading}
            tabIndex={-1}
            className="text-2xl font-bold tracking-[-0.02em]"
          >
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
              {plan === 'yearly' && discounted && '50% off the first year · '}
              {cost.next}
            </small>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              commitDetails()
            }}
          >
            <label htmlFor="checkout-email" className="mt-4 block text-sm font-bold text-[#231f33]">
              Email for your account
            </label>
            <input
              id="checkout-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={emailDraft}
              onChange={(event) => setEmailDraft(event.target.value)}
              onBlur={commitDetails}
              aria-invalid={emailInvalid}
              aria-describedby={emailInvalid ? 'checkout-email-error' : undefined}
              className={`mt-2 h-13 w-full rounded-xl border bg-white px-4 text-base text-[#231f33] outline-none ${emailInvalid ? 'border-red-600' : 'border-[#d3ccdf] focus:border-[#4a36ae]'}`}
            />
            {emailInvalid && (
              <p id="checkout-email-error" className="mt-1 text-sm text-red-700">
                Enter a valid email address.
              </p>
            )}
            {needsZip && (
              <>
                <label
                  htmlFor="checkout-zip"
                  className="mt-4 block text-sm font-bold text-[#231f33]"
                >
                  {country === 'US' ? 'ZIP code' : 'Postal code'}
                </label>
                <input
                  id="checkout-zip"
                  autoComplete="postal-code"
                  value={zipDraft}
                  onChange={(event) => setZipDraft(event.target.value)}
                  onBlur={commitDetails}
                  className="mt-2 h-13 w-full rounded-xl border border-[#d3ccdf] bg-white px-4 text-base text-[#231f33] outline-none focus:border-[#4a36ae]"
                />
              </>
            )}
            <button type="submit" hidden />
          </form>

          <h4 className="mt-4 text-sm font-bold text-[#231f33]">Card information</h4>
          <div
            className={`relative mt-2 w-full rounded-xl bg-white ${canOpen && !loading ? '' : 'min-h-40'}`}
          >
            {(!canOpen || loading) && (
              <p
                role="status"
                className="absolute inset-x-0 top-8 px-4 text-center text-sm text-[#5f5a72]"
              >
                {country === undefined || (canOpen && loading)
                  ? 'Loading secure card form…'
                  : !isValidEmail(email)
                    ? 'Enter your email to continue.'
                    : `Enter your ${country === 'US' ? 'ZIP' : 'postal'} code to continue.`}
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
