'use client'

import { useRef } from 'react'
import { isValidEmail } from '@/lib/email'
import { useFlow } from './FlowProvider'
import { StickyAction } from './Ui'

export function EmailScreen() {
  const { email, setEmail, go, ready } = useFlow()
  const input = useRef<HTMLInputElement>(null)
  if (!ready) return null
  const canContinue = isValidEmail(email)

  const continueToOffer = () => {
    if (!canContinue) return
    if (!input.current?.reportValidity()) return
    setEmail(email.trim())
    go('offer')
  }

  return (
    <>
      <h2 className="max-w-65 text-2xl leading-[1.1]">Which email will you use?</h2>
      <p className="mt-3 text-sm text-[#5f5a72]">Use the same email at checkout.</p>
      <label htmlFor="plan-email" className="mt-5 text-base font-bold text-[#231f33]">
        Email address
      </label>
      <input
        ref={input}
        id="plan-email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="mt-1 h-15 w-full rounded-xl border border-[#d3ccdf] bg-white px-3 text-base text-[#231f33] outline-none focus:border-[#5b45c8]"
      />
      <p className="mt-3 text-[11px] leading-[1.4] text-[#5f5a72]">
        Your email will be used to prefill Paddle checkout.
      </p>
      <StickyAction onClick={continueToOffer} disabled={!canContinue}>
        Continue
      </StickyAction>
    </>
  )
}
