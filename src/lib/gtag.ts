import { GA_ID, type GA_EVENT, type GA_PARAM } from '@/utils/const'

export type GaEvent = (typeof GA_EVENT)[keyof typeof GA_EVENT]
type GaParam = (typeof GA_PARAM)[keyof typeof GA_PARAM]
type GtagParams = Partial<Record<GaParam, string | number | boolean>>
declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function trackEvent(name: GaEvent, params: GtagParams = {}) {
  if (typeof window === 'undefined' || !GA_ID || !window.gtag) return
  window.gtag('event', name, params)
}
