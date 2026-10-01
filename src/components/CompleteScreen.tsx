'use client'

import { useFlow } from '@/components/FlowProvider'
import { TemplateArt } from '@/components/Art'
import { CheckIcon } from '@/components/CheckIcon'
import { makePlan } from '@/lib/plan'

export function CompleteScreen() {
  const { answers, email, ready } = useFlow()
  if (!ready) return null
  const keys = makePlan(answers)
    .filter((key) => key !== 'photo')
    .slice(0, 3)
  const tips = [
    [
      'Setup',
      answers.device === 'tablet'
        ? 'Lay a thin sheet of paper on the screen and turn the brightness up.'
        : 'Prop your phone on a stand, a tall glass or a stack of books, camera facing down, about 30 cm above the paper.',
    ],
    [
      'Practice',
      {
        full: 'Start with step-by-step tracing, one step at a time.',
        outline: 'Trace the outline first, then add the details freehand.',
        reference: 'Keep the image in view and use it as a guide while you draw.',
      }[String(answers.style)] || 'Start with step-by-step tracing.',
    ],
    [
      'Reminders',
      {
        daily: 'Turn on daily practice reminders in the app.',
        three: 'Turn on reminders 3 times a week in the app.',
      }[String(answers.remind)] || 'Draw whenever suits you.',
    ],
  ]
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-5 h-40 w-[260px]">
        {keys.map((key, i) => (
          <TemplateArt
            key={`${key}-${i}`}
            name={key}
            className={`absolute top-4 left-[70px] size-[120px] border-[3px] border-white !rounded-3xl ${i === 0 ? '-translate-x-[65px] -rotate-12' : i === 2 ? 'translate-x-[65px] rotate-12' : 'z-10 !top-0'}`}
          />
        ))}
      </div>
      <h2>Go grab a pencil.</h2>
      <p className="mt-4 text-lg text-[#5f5a72]">
        This is a preview of the next steps. No payment has been taken.
        {email && (
          <>
            {' '}
            Use <b className="text-[#231f33]">{email}</b> when checkout becomes available.
          </>
        )}
      </p>
      <div className="surface mt-6 w-full rounded-[32px] p-5 text-left">
        <b className="text-[#231f33]">Your 7-day plan</b>
        <p className="mt-1 text-base text-[#5f5a72]">
          Your answers have been saved on this device for this preview.
        </p>
      </div>
      <div className="mt-4 w-full space-y-3 text-left">
        {tips.map(([label, detail]) => (
          <p key={label} className="flex gap-2.5">
            <span className="grid size-[22px] shrink-0 place-items-center rounded-full bg-[#5b45c8] text-white">
              <CheckIcon />
            </span>
            <span>
              <b className="text-[#231f33]">{label}:</b> {detail}
            </span>
          </p>
        ))}
      </div>
      <div className="mt-7 flex w-full flex-col gap-2.5">
        <a
          className="brand-font grid min-h-[52px] place-items-center rounded-full bg-[#231f33] font-semibold text-white"
          href="https://apps.apple.com/us/app/ar-sketch-trace/id6754591942"
          target="_blank"
          rel="noopener noreferrer"
        >
          Download on the App Store
        </a>
        <a
          className="brand-font grid min-h-[52px] place-items-center rounded-full bg-[#231f33] font-semibold text-white"
          href="https://play.google.com/store/apps/details?id=com.ar.trace.sketch.draw"
          target="_blank"
          rel="noopener noreferrer"
        >
          Get it on Google Play
        </a>
      </div>
    </div>
  )
}
