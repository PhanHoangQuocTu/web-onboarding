'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { OFFER_DURATION_MS } from '@/lib/pricing'

function format(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000))
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export function OfferCountdown({
  expiresAt,
  onExpire,
  onGone,
  showGo,
  onGo,
}: {
  expiresAt: number | undefined
  onExpire: () => void
  onGone: () => void
  showGo: boolean
  onGo: () => void
}) {
  const [now, setNow] = useState(() => Date.now())
  const left = expiresAt === undefined ? OFFER_DURATION_MS : expiresAt - now
  const expired = left <= 0
  useEffect(() => {
    if (expiresAt === undefined) return
    if (expired) {
      onExpire()
      const id = setTimeout(onGone, 5000)
      return () => clearTimeout(id)
    }
    // Wake up on the next whole-second boundary.
    const id = setTimeout(() => setNow(Date.now()), left % 1000 || 1000)
    return () => clearTimeout(id)
  }, [expiresAt, expired, left, onExpire, onGone])

  const go = showGo && !expired
  return createPortal(
    <div
      role="timer"
      className={`brand-font fixed left-1/2 top-[calc(12px+env(safe-area-inset-top,0px))] z-30 flex min-h-14 w-[calc(100%-24px)] max-w-[416px] -translate-x-1/2 items-center gap-3 rounded-[28px] py-2 pl-5 text-base font-semibold shadow-[0_0_0_1px_var(--hair),0_10px_24px_rgba(35,31,51,0.12)] ${go ? 'pr-2' : 'pr-5'} ${expired ? 'bg-(--surface-2) text-(--muted)' : 'bg-white text-(--ink)'}`}
    >
      <span className="min-w-0 flex-1 whitespace-nowrap">
        {expired ? 'Discount expired' : 'Discount expires in'}
      </span>
      {!expired && (
        <b className="shrink-0 text-lg font-bold tracking-[-0.035em] text-(--accent-text) tabular-nums">
          {format(left)}
        </b>
      )}
      {go && (
        <button
          type="button"
          onClick={onGo}
          className="h-10 shrink-0 rounded-[20px] bg-(--primary) px-3.5 text-white hover:bg-(--primary-hover)"
        >
          Get my plan
        </button>
      )}
    </div>,
    document.body,
  )
}
