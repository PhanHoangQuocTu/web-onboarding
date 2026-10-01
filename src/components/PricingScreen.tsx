'use client'

import { useCallback, useRef, useState } from 'react'
import { useFlow } from '@/components/FlowProvider'
import { CheckoutSheet } from '@/components/CheckoutSheet'
import { CheckIcon } from '@/components/CheckIcon'
import { PaymentActions } from '@/components/PaymentActions'
import { PricingDetails, ValuePanel } from '@/components/PricingDetails'
import { trackEvent } from '@/lib/gtag'
import { subject } from '@/lib/plan'
import { amountDueToday, money, price, TRIAL, WEEK, YEAR_50_OFF } from '@/lib/pricing'
import { GA_CURRENCY, GA_EVENT, GA_PARAM } from '@/utils/const'

const plans = [
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
    description: `≈ ${money(YEAR_50_OFF / 52)} a week`,
    cost: money(YEAR_50_OFF),
    period: '/year',
  },
] as const

export function PricingScreen() {
  const { answers, plan, setPlan, ready } = useFlow()
  const [sheet, setSheet] = useState(false)
  const plansRef = useRef<HTMLDivElement>(null)
  const closeSheet = useCallback(() => setSheet(false), [])
  if (!ready) return null
  const amount = price(plan)
  const payParams = {
    [GA_PARAM.PLAN]: plan,
    [GA_PARAM.CURRENCY]: GA_CURRENCY,
    [GA_PARAM.VALUE]: amountDueToday(plan),
  }
  const scrollToPlans = () =>
    plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  return (
    <>
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
        {plans.map((item) => (
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
                  [GA_PARAM.VALUE]: amountDueToday(item.id),
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
                50% off
              </em>
            )}
          </button>
        ))}
      </div>
      <PaymentActions
        onGooglePayClick={() => trackEvent(GA_EVENT.PAY_GOOGLE_PAY_CLICK, payParams)}
        onApplePayClick={() => trackEvent(GA_EVENT.PAY_APPLE_PAY_CLICK, payParams)}
        onPayPalClick={() => trackEvent(GA_EVENT.PAY_PAYPAL_CLICK, payParams)}
        onCardClick={() => {
          trackEvent(GA_EVENT.BEGIN_CHECKOUT, payParams)
          setSheet(true)
        }}
      />
      <div className="mt-3 ">
        <p className="text-center text-sm text-[#5f5a72]">
          Due today {amount.today}. {plan === 'yearly' && '50% off the first year.'}
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
      {sheet && <CheckoutSheet onClose={closeSheet} />}
    </>
  )
}
