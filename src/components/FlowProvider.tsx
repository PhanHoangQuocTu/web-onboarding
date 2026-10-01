'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { trackEvent } from '@/lib/gtag'
import type { Answers, AnswerValue } from '@/lib/quiz'
import { GA_EVENT, GA_PARAM, GA_VALUE } from '@/utils/const'
import type { Plan } from '@/lib/pricing'

type Receipt = { plan: Plan; today: string; next: string; method: string }
type FlowState = {
  step: string
  answers: Answers
  plan: Plan
  email: string
  receipt?: Receipt
  offerRevealed: boolean
}
type FlowContextValue = FlowState & {
  ready: boolean
  go: (step: string) => void
  setAnswer: (key: string, value: AnswerValue) => void
  setPlan: (plan: Plan) => void
  setEmail: (email: string) => void
  revealOffer: (method?: string) => void
  setReceipt: (receipt: Receipt) => void
}
const initial: FlowState = {
  step: 'who',
  answers: { frust: [] },
  plan: 'yearly',
  email: '',
  offerRevealed: false,
}
const FlowContext = createContext<FlowContextValue | null>(null)
const storageKey = 'ar-sketch-next-flow'

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const [state, update] = useState<FlowState>(initial)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      // The stored flow is available only after the client mounts.
      if (stored) {
        const saved = JSON.parse(stored) as Partial<FlowState>
        // oxlint-disable-next-line react/set-state-in-effect
        update({
          ...initial,
          ...saved,
          email: '',
          step: saved.step === 'commit' ? 'loading' : saved.step || 'who',
        })
      }
    } catch {
      /* Storage may be unavailable. The flow still works in memory. */
    }
    setReady(true)
  }, [])
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ ...state, email: '' }))
      } catch {
        /* Storage may be unavailable. */
      }
    }
  }, [ready, state])
  const go = useCallback((step: string) => {
    update((s) => ({ ...s, step }))
    window.scrollTo(0, 0)
  }, [])
  const setAnswer = (key: string, value: AnswerValue) =>
    update((s) => ({ ...s, answers: { ...s.answers, [key]: value } }))
  const setPlan = (plan: Plan) => update((s) => ({ ...s, plan }))
  const setEmail = (email: string) => update((s) => ({ ...s, email }))
  const revealOffer = (method: string = GA_VALUE.SCRATCH) => {
    if (state.offerRevealed) return
    trackEvent(GA_EVENT.OFFER_REVEAL, { [GA_PARAM.METHOD]: method })
    update((s) => ({ ...s, offerRevealed: true }))
  }
  const setReceipt = (receipt: Receipt) => update((s) => ({ ...s, receipt }))
  return (
    <FlowContext.Provider
      value={{ ...state, ready, go, setAnswer, setPlan, setEmail, revealOffer, setReceipt }}
    >
      {children}
    </FlowContext.Provider>
  )
}

export function useFlow() {
  const value = useContext(FlowContext)
  if (!value) throw new Error('FlowProvider is missing')
  return value
}
