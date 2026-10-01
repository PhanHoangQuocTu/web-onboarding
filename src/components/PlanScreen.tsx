'use client'

import { useFlow } from '@/components/FlowProvider'
import { IconArt } from '@/components/Art'
import { PlanCarousel } from '@/components/PlanCarousel'
import { StickyAction } from '@/components/Ui'
import { duration, forKids, makePlan, mode, skill, subject } from '@/lib/plan'

function PlanChip({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="brand-font inline-flex min-h-10 items-center gap-2 rounded-full border border-[#ddd8e8] bg-white px-3 py-1 text-base font-semibold text-[#231f33]">
      <IconArt name={icon} size={24} />
      {label}
    </span>
  )
}

export function PlanScreen() {
  const { answers, go, ready } = useFlow()
  if (!ready) return null
  const plan = makePlan(answers)
  return (
    <>
      <h2>
        Your 7-day plan
        <span className="block">
          is <span className="text-[#4a36ae]">ready</span>.
        </span>
      </h2>
      <div className="mt-5 space-y-2">
        <div className="flex flex-wrap gap-2">
          <PlanChip icon="pencil" label={subject(answers).t} />
          <PlanChip icon={String(answers.level || 'beginner')} label={skill(answers).chip} />
        </div>
        <div>
          <PlanChip icon={answers.device === 'tablet' ? 'tablet' : 'phone'} label={mode(answers)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <PlanChip icon={String(answers.time || 'mid')} label={duration(answers).chip} />
          {forKids(answers) && <PlanChip icon="kids" label="Kid-safe" />}
        </div>
      </div>
      <h3 className="brand-font mt-8 text-lg font-bold text-[#231f33]">Your 7 days</h3>
      <PlanCarousel key={plan.join('|')} plan={plan} />
      <StickyAction onClick={() => go('email')}>Continue</StickyAction>
    </>
  )
}
