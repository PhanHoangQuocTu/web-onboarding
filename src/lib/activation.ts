import { useEffect, useState } from 'react'

export type Activation =
  | { state: 'loading' }
  | { state: 'ready'; code: string }
  | { state: 'failed' }

const RETRY_DELAYS_MS = [1000, 2000, 3000, 5000, 8000, 13000]

export function useActivation(transactionId?: string, sessionId?: string) {
  const [activation, setActivation] = useState<Activation>({ state: 'loading' })
  useEffect(() => {
    if (!transactionId || !sessionId) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const query = new URLSearchParams({ transactionId, sessionId })
    const poll = async (attempt: number) => {
      try {
        const response = await fetch(`/api/activation?${query}`, { cache: 'no-store' })
        const body = (await response.json()) as { code?: string }
        if (cancelled) return
        if (response.status === 200 && body.code)
          return setActivation({ state: 'ready', code: body.code })
      } catch {
        /* Retry below. */
      }
      if (cancelled) return
      if (attempt >= RETRY_DELAYS_MS.length) return setActivation({ state: 'failed' })
      timer = setTimeout(() => void poll(attempt + 1), RETRY_DELAYS_MS[attempt])
    }
    void poll(0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [transactionId, sessionId])
  return activation
}
