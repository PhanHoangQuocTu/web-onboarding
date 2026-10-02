'use client'

import { useCallback, useState } from 'react'
import { useFlow } from '@/components/FlowProvider'
import { IconArt } from '@/components/Art'
import { PlanCarousel } from '@/components/PlanCarousel'
import { StickyAction } from '@/components/Ui'
import { duration, forKids, makePlan, mode, skill, subject } from '@/lib/plan'

function PlanChip({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="brand-font inline-flex items-center gap-1.5 rounded-full bg-white py-[5px] pl-1.5 pr-3.5 text-base font-semibold text-(--ink) shadow-[0_0_0_1px_var(--hair)]">
      <IconArt name={icon} size={24} />
      {label}
    </span>
  )
}

export function PlanScreen() {
  const { answers, go, ready } = useFlow()
  const [allRevealed, setAllRevealed] = useState(false)
  const onAllRevealed = useCallback(() => setAllRevealed(true), [])
  if (!ready) return null
  const plan = makePlan(answers)
  return (
    <>
      <h2>
        Your 7-day plan
        <span className="block">
          is <span className="text-(--accent-text)">ready</span>.
        </span>
      </h2>
      <div className="mt-[18px] flex flex-wrap gap-2">
        <PlanChip icon="pencil" label={subject(answers).t} />
        <PlanChip icon={String(answers.level || 'beginner')} label={skill(answers).chip} />
        <PlanChip icon={answers.device === 'tablet' ? 'tablet' : 'phone'} label={mode(answers)} />
        <PlanChip icon={String(answers.time || 'mid')} label={duration(answers).chip} />
        {forKids(answers) && <PlanChip icon="check" label="Kid-safe" />}
      </div>
      <h3 className="brand-font mt-6 text-lg font-bold text-(--ink)">Your 7 days</h3>
      <PlanCarousel key={plan.join('|')} plan={plan} onAllRevealed={onAllRevealed} />
      <StickyAction
        onClick={() => go('email')}
        secondary={!allRevealed}
        trackKey={allRevealed ? 'continue' : 'skip_reveal'}
      >
        {allRevealed ? 'Continue' : 'Skip reveal & continue'}
      </StickyAction>
    </>
  )
}
