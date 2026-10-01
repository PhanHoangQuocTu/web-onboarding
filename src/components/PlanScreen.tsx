'use client'

import { useFlow } from '@/components/FlowProvider'
import { Chips, PlanList, StickyAction } from '@/components/Ui'
import { duration, forKids, makePlan, mode, skill, subject } from '@/lib/plan'

export function PlanScreen() {
  const { answers, go, ready } = useFlow()
  if (!ready) return null
  const chips = [subject(answers).t, skill(answers).chip, mode(answers), duration(answers).chip]
  if (forKids(answers)) chips.push('Kid-safe')
  return (
    <>
      <h2>
        Your 7-day plan
        <span className="block">
          is <span className="text-[#4a36ae]">ready</span>.
        </span>
      </h2>
      <Chips items={chips} />
      <PlanList plan={makePlan(answers)} answers={answers} />
      <StickyAction onClick={() => go('offer')}>Get my plan</StickyAction>
    </>
  )
}
