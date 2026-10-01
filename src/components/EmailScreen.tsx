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
      <h2>Which email will you use?</h2>
      <p className="lede">Use the same email at checkout.</p>
      <div className="mt-6 grid gap-2">
        <label htmlFor="plan-email" className="text-base font-semibold text-(--ink)">
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
          inputMode="email"
          className="w-full rounded-2xl border border-(--line) bg-white px-4 py-3.5 text-xl text-(--ink)"
        />
      </div>
      <StickyAction onClick={continueToOffer} disabled={!canContinue}>
        Continue
      </StickyAction>
    </>
  )
}
