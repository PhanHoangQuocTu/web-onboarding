'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/gtag'
import type { Answers, AnswerValue } from '@/lib/quiz'
import { GA_EVENT, GA_PARAM, GA_VALUE } from '@/utils/const'
import { OFFER_DURATION_MS, type Plan } from '@/lib/pricing'

type Receipt = { plan: Plan; transactionId: string; method: string; paidToday: string }
type FlowState = {
  sessionId: string
  step: string
  answers: Answers
  plan: Plan
  email: string
  receipt?: Receipt
  offerRevealed: boolean
  offerExpiresAt?: number
}
type FlowContextValue = FlowState & {
  ready: boolean
  go: (step: string) => void
  setAnswer: (key: string, value: AnswerValue) => void
  setPlan: (plan: Plan) => void
  setEmail: (email: string) => void
  revealOffer: (method?: string) => void
  setReceipt: (receipt: Receipt) => void
  startOfferTimer: () => void
}
const initial: FlowState = {
  sessionId: '',
  step: 'who',
  answers: { frust: [] },
  plan: 'yearly',
  email: '',
  offerRevealed: false,
}
const FlowContext = createContext<FlowContextValue | null>(null)
const storageKey = 'ar-sketch-next-flow'
const saveSteps = new Set(['loading', 'offer', 'pricing'])

function newSessionId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

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
    update((s) => (s.sessionId ? s : { ...s, sessionId: newSessionId() }))
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
  const latest = useRef(state)
  useEffect(() => {
    latest.current = state
  })
  useEffect(() => {
    if (!ready || !saveSteps.has(state.step)) return
    const { sessionId, answers, email, plan, step } = latest.current
    void fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sessionId, answers, email, plan, step }),
      keepalive: true,
    }).catch(() => {
      /* Saving answers must never block the funnel. */
    })
  }, [ready, state.step])
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
  const setReceipt = useCallback((receipt: Receipt) => update((s) => ({ ...s, receipt })), [])
  const startOfferTimer = useCallback(
    () =>
      update((s) =>
        s.offerExpiresAt ? s : { ...s, offerExpiresAt: Date.now() + OFFER_DURATION_MS },
      ),
    [],
  )
  return (
    <FlowContext.Provider
      value={{
        ...state,
        ready,
        go,
        setAnswer,
        setPlan,
        setEmail,
        revealOffer,
        setReceipt,
        startOfferTimer,
      }}
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
