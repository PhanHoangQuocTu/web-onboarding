'use client'

import { useCallback, useRef, useState } from 'react'
import { useFlow } from '@/components/FlowProvider'
import { CheckoutSheet } from '@/components/CheckoutSheet'
import { CheckIcon } from '@/components/CheckIcon'
import { PricingDetails, ValuePanel } from '@/components/PricingDetails'
import { subject } from '@/lib/plan'
import { money, price, WEEK, YEAR, YEAR_10_OFF } from '@/lib/pricing'

export function PricingScreen() {
  const { answers, plan, setPlan, ready } = useFlow()
  const [sheet, setSheet] = useState(false)
  const plansRef = useRef<HTMLDivElement>(null)
  const closeSheet = useCallback(() => setSheet(false), [])
  if (!ready) return null
  const amount = price(plan)
  const scrollToPlans = () =>
    plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  return (
    <>
      {/* <p className="brand-font mb-3 text-sm font-semibold uppercase tracking-wider text-[#4a36ae]">
        {forKids(answers) ? 'Made for your child' : 'Made for you'}
      </p> */}
      <h2>
        Draw <span className="text-[#4a36ae]">{subject(answers).pro}</span> in 7 days
      </h2>
      {/* <div className="mt-5 grid grid-cols-7 gap-1.5">
        {keys.map((key, i) => (
          <TemplateArt name={key} key={`${key}-${i}`} className="w-full" />
        ))}
      </div> */}

      <ValuePanel />

      <div ref={plansRef} className="mt-6 space-y-3" role="radiogroup" aria-label="Choose a plan">
        {(['weekly', 'yearly'] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="radio"
            aria-checked={plan === item}
            onClick={() => setPlan(item)}
            className="answer-card surface relative flex w-full items-center gap-3.5 rounded-[28px] px-5 py-4 text-left"
          >
            <span className="radio" aria-hidden="true">
              <CheckIcon />
            </span>
            <span className="min-w-0 flex-1">
              <b className="brand-font block text-xl text-[#231f33]">
                {item === 'yearly' ? 'Yearly' : 'Weekly'}
              </b>

              <small className="block text-base text-[#5f5a72]">
                {item === 'yearly' ? `≈ ${money(YEAR_10_OFF / 52)} a week` : 'Billed every week'}
              </small>
            </span>

            <span className="brand-font text-right text-2xl font-bold text-[#231f33] tabular-nums">
              {item === 'yearly' ? money(YEAR_10_OFF) : money(WEEK)}
              <small className="block text-sm font-semibold text-[#5f5a72]">
                /{item === 'yearly' ? 'year' : 'week'}
              </small>
            </span>

            {item === 'yearly' && (
              <em className="brand-font absolute -top-2.5 right-5 rounded-full bg-[#2e2750] px-2.5 py-0.5 text-sm font-semibold not-italic text-white">
                Save 90%
              </em>
            )}
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-2.5">
        <button
          type="button"
          disabled
          className="h-14 w-full cursor-not-allowed rounded-full bg-black font-semibold text-[#2E2750] surface"
        >
          Pay with Google Pay
        </button>
        <button
          type="button"
          disabled
          className="h-14 w-full rounded-full bg-black font-semibold text-white"
        >
          Pay with Apple Pay
        </button>
        <button type="button" onClick={() => setSheet(true)} className="primary-button w-full">
          Pay with card
        </button>
      </div>
      <div className="mt-3 ">
        <p className="text-center text-sm text-[#5f5a72]">Due today {amount.today}.</p>
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
