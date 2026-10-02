import Script from 'next/script'
import { GA_ID } from '@/utils/const'

// The dataLayer and config are set up by trackEvent in src/lib/gtag.ts.
export function GoogleAnalytics() {
  if (!GA_ID) return null
  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      strategy="afterInteractive"
    />
  )
}
