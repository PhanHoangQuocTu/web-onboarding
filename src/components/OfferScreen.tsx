'use client'

import { useFlow } from '@/components/FlowProvider'
import { ScratchCard } from '@/components/ScratchCard'
import { StickyAction } from '@/components/Ui'
import { GA_VALUE } from '@/utils/const'

export function OfferScreen() {
  const { offerRevealed, revealOffer, go, ready } = useFlow()
  if (!ready) return null

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative aspect-3/2 w-full overflow-hidden rounded-[28px] border border-[#e5e0ed] bg-white">
        <div
          aria-hidden={!offerRevealed}
          className="flex size-full flex-col items-center justify-center text-center"
        >
          <div className="brand-font flex items-baseline gap-2">
            <span className="text-[clamp(4rem,18vw,5rem)] font-bold leading-none text-[#4a36ae]">
              50%
            </span>
            <span className="text-2xl font-bold text-[#231f33]">OFF</span>
          </div>
          <p className="mt-3 text-base leading-snug text-[#5f5a72]">
            your first year of
            <strong className="block text-[#231f33]">Yearly Subscription</strong>
          </p>
        </div>
        <ScratchCard revealed={offerRevealed} onReveal={() => revealOffer(GA_VALUE.SCRATCH)} />
      </div>
      <StickyAction
        onClick={offerRevealed ? () => go('pricing') : () => revealOffer(GA_VALUE.BUTTON)}
      >
        {offerRevealed ? 'Use my discount' : 'Reveal my gift'}
      </StickyAction>
    </div>
  )
}
