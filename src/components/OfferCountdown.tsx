'use client'

import { useEffect, useState } from 'react'
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
}: {
  expiresAt: number | undefined
  onExpire: () => void
}) {
  const [now, setNow] = useState(() => Date.now())
  const left = expiresAt === undefined ? OFFER_DURATION_MS : expiresAt - now
  const expired = left <= 0
  useEffect(() => {
    if (expiresAt === undefined) return
    if (expired) {
      onExpire()
      return
    }
    // Wake up on the next whole-second boundary.
    const id = setTimeout(() => setNow(Date.now()), left % 1000 || 1000)
    return () => clearTimeout(id)
  }, [expiresAt, expired, left, onExpire])

  if (expired) return null
  return (
    <div
      role="timer"
      className="sticky top-3 z-30 -mx-3.5 -mt-7 mb-4 flex items-center justify-between gap-3 rounded-full bg-white px-5 py-4 shadow-[0_8px_24px_rgba(35,31,51,0.12)]"
    >
      <span className="text-base font-semibold text-[#231f33]">Discount expires in</span>
      <b className="brand-font text-lg font-bold text-[#4a36ae] tabular-nums">{format(left)}</b>
    </div>
  )
}
