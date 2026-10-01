'use client'

import { useFlow } from '@/components/FlowProvider'
import { ScratchCard } from '@/components/ScratchCard'
import { Phrases, StickyAction } from '@/components/Ui'
import { subject } from '@/lib/plan'
import { GA_VALUE, PROMO_CODE } from '@/utils/const'
import { CheckIcon } from './CheckIcon'

export function OfferScreen() {
  const { answers, offerRevealed, revealOffer, go, ready } = useFlow()
  if (!ready) return null
  return (
    <div className="flex flex-1 flex-col items-center text-center">
      <h2 className="self-stretch text-center">
        <Phrases text={offerRevealed ? 'You got 10% off!' : 'A welcome gift for you'} />
      </h2>
      <p className="mt-3 text-lg text-[#5f5a72] text-center max-w-72">
        {offerRevealed
          ? 'Off your first year, added at checkout. Saved for 10 minutes.'
          : 'Scratch to see it.'}
      </p>
      <div className="surface relative mt-6 w-full max-w-85 overflow-hidden rounded-[1.75rem] text-left">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-5 py-7 min-[380px]:gap-4 min-[380px]:px-7">
          <div className="text-center">
            <span className="brand-font block whitespace-nowrap text-[clamp(3rem,14vw,4rem)] font-bold leading-none text-[#4a36ae]">
              10<span className="text-[0.5em]">%</span>
            </span>
            <span className="brand-font mt-2 block text-2xl font-bold leading-none text-[#231f33]">
              OFF
            </span>
          </div>
          <p className="min-w-0 text-sm leading-snug text-[#5f5a72] min-[380px]:text-base">
            your first year of
            <strong className="block text-base font-bold leading-snug text-[#231f33] min-[380px]:text-lg">
              Draw {subject(answers).pro} like a Pro
            </strong>
          </p>
        </div>
        {PROMO_CODE && (
          <div className="flex items-center justify-between border-t-2 border-dashed border-[#d3ccdf] bg-[#ece8f2] px-7 py-4 text-sm text-[#5f5a72]">
            <span>Promo code</span>
            <div className="flex items-center gap-2">
              <CheckIcon color="#4a36ae" />
              <b className="brand-font text-base text-[#231f33]">{PROMO_CODE}</b>
            </div>
          </div>
        )}
        <ScratchCard revealed={offerRevealed} onReveal={() => revealOffer()} />
      </div>
      {!offerRevealed && (
        <button
          type="button"
          onClick={() => revealOffer(GA_VALUE.BUTTON)}
          className="mt-4 min-h-11 px-3 text-base font-semibold text-[#4a36ae] underline underline-offset-4"
        >
          Reveal without scratching
        </button>
      )}
      {offerRevealed && <StickyAction onClick={() => go('pricing')}>Use my discount</StickyAction>}
    </div>
  )
}
