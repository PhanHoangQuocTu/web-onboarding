'use client'

import { useEffect, useRef } from 'react'
import { useFlow } from './FlowProvider'
import { TemplateArt } from './Art'
import { makePlan, skill, subject } from '@/lib/plan'
import { price } from '@/lib/pricing'

export function CheckoutSheet({ onClose }: { onClose: () => void }) {
  const { answers, plan, email, setEmail, go } = useFlow()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
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
  const planKeys = makePlan(answers)
    .filter((key) => key !== 'photo')
    .slice(0, 3)
  const cost = price(plan)
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#231f33]/45"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        className="max-h-[92dvh] w-full max-w-[440px] overflow-y-auto overscroll-contain rounded-t-[40px] bg-[#f4f2f7] px-6 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#d3ccdf]" />
        <h3 id="checkout-title" ref={heading} tabIndex={-1} className="text-2xl font-bold">
          {plan === 'yearly' ? 'Yearly plan' : 'Weekly plan'}
        </h3>
        <div className="surface mt-4 flex items-center gap-3 rounded-3xl p-3">
          <div className="flex">
            {planKeys.map((key, i) => (
              <TemplateArt
                key={`${key}-${i}`}
                name={key}
                className={`size-10 border-2 border-white ${i ? '-ml-2.5' : ''}`}
              />
            ))}
          </div>
          <span>
            <b className="block text-base text-[#231f33]">Your 7-day {subject(answers).t} plan</b>
            <small className="text-sm text-[#5f5a72]">
              Made for {skill(answers).t.toLowerCase()}
            </small>
          </span>
        </div>
        <div className="mt-4 rounded-[20px] bg-[#ece8f2] p-4">
          <div className="flex items-baseline justify-between font-semibold">
            <span>Due today</span>
            <b className="brand-font text-2xl text-[#231f33]">{cost.today}</b>
          </div>
          <small className="text-sm text-[#5f5a72]">{cost.next}</small>
        </div>
        <label className="mt-4 block text-base font-bold text-[#231f33]" htmlFor="checkout-email">
          Email for your account
        </label>
        <input
          id="checkout-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="mt-1.5 h-[52px] w-full rounded-2xl border border-[#d3ccdf] bg-white px-4 text-lg"
        />
        <div className="mt-4 rounded-2xl border border-[#d3ccdf] bg-white p-4">
          <b className="text-base text-[#231f33]">Payment integration pending</b>
          <p className="mt-1 text-sm text-[#5f5a72]">
            This is a checkout preview. No payment is taken, and card details are not collected.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="primary-button mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          Pay {cost.today}
        </button>
        <button
          type="button"
          onClick={() => {
            onClose()
            go('complete')
          }}
          className="mt-3 min-h-11 w-full text-base font-semibold text-[#4a36ae] underline underline-offset-4"
        >
          Preview next steps
        </button>
        <p className="mt-3 text-center text-sm text-[#5f5a72]">
          Renews automatically until you cancel. Cancel anytime before the renewal date.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 min-h-11 w-full text-base font-semibold text-[#4a36ae]"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
