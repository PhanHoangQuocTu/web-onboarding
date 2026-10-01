'use client'

import { useState } from 'react'
import { useFlow } from '@/components/FlowProvider'
import { ScratchCard } from '@/components/ScratchCard'
import { StickyAction } from '@/components/Ui'
import { GA_VALUE } from '@/utils/const'

const confettiColors = ['#CFC3F2', '#F9D3B8', '#F8E7A1', '#CDEBD9', '#CFE3F5', '#F6CFD8']

export function OfferScreen() {
  const { offerRevealed, revealOffer, go, ready } = useFlow()
  const [auto, setAuto] = useState(false)
  const [justRevealed, setJustRevealed] = useState(false)
  if (!ready) return null
  const reveal = (method: string) => {
    if (offerRevealed) return
    setJustRevealed(true)
    revealOffer(method)
  }

  return (
    <div className="flex flex-1 flex-col items-center">
      <h2 className="sr-only">{offerRevealed ? 'You got 50% off!' : 'A welcome gift for you'}</h2>
      <div className="relative h-[227px] w-full max-w-[340px] overflow-hidden rounded-[28px] bg-white shadow-[0_0_0_1px_var(--hair)]">
        <div
          aria-hidden={!offerRevealed}
          className="flex size-full flex-col items-center justify-center gap-3 px-6 py-7 text-center"
        >
          <div className="flex items-baseline justify-center gap-1">
            <b className="brand-font text-[64px] font-bold leading-none tracking-[-0.035em] text-(--accent-text) tabular-nums">
              50%
            </b>
            <span className="brand-font text-2xl font-bold text-(--ink)">OFF</span>
          </div>
          <p className="text-base leading-[1.4] text-balance text-(--muted)">
            your first year of
            <strong className="block text-(--ink)">Yearly Subscription</strong>
          </p>
        </div>
        <ScratchCard
          revealed={offerRevealed}
          auto={auto}
          onReveal={() => reveal(auto ? GA_VALUE.BUTTON : GA_VALUE.SCRATCH)}
        />
      </div>
      {justRevealed && (
        <div className="coupon-confetti relative h-0 w-full" aria-hidden="true">
          {Array.from({ length: 28 }, (_, n) => (
            <i
              key={n}
              style={{
                left: `${(n * 37) % 100}%`,
                background: confettiColors[n % 6],
                animationDelay: `${(n % 7) * 60}ms`,
                transform: `rotate(${n * 47}deg)`,
              }}
            />
          ))}
        </div>
      )}
      {offerRevealed ? (
        <StickyAction onClick={() => go('pricing')}>Use my discount</StickyAction>
      ) : (
        !auto && <StickyAction onClick={() => setAuto(true)}>Reveal my gift</StickyAction>
      )}
    </div>
  )
}
