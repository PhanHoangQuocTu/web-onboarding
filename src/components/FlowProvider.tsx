'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { Answers, AnswerValue } from '@/lib/quiz'

type Receipt = { plan: 'yearly' | 'weekly'; today: string; next: string; method: string }
type FlowState = {
  step: string
  answers: Answers
  plan: 'yearly' | 'weekly'
  email: string
  receipt?: Receipt
  offerRevealed: boolean
}
type FlowContextValue = FlowState & {
  ready: boolean
  go: (step: string) => void
  setAnswer: (key: string, value: AnswerValue) => void
  setPlan: (plan: 'yearly' | 'weekly') => void
  setEmail: (email: string) => void
  revealOffer: () => void
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
      // oxlint-disable-next-line react/set-state-in-effect
      if (stored) update({ ...initial, ...JSON.parse(stored) })
    } catch {
      /* Storage may be unavailable. The flow still works in memory. */
    }
    setReady(true)
  }, [])
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state))
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
  const setPlan = (plan: 'yearly' | 'weekly') => update((s) => ({ ...s, plan }))
  const setEmail = (email: string) => update((s) => ({ ...s, email }))
  const revealOffer = () => update((s) => ({ ...s, offerRevealed: true }))
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
