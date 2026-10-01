'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/gtag'
import { previousStep, questionNumber } from '@/lib/quiz'
import { useFlow } from './FlowProvider'
import { GA_EVENT, GA_PARAM } from '@/utils/const'

const steps = ['About you', 'Your practice', 'Your plan']
const statuses: Record<string, string> = {
  loading: 'Building your plan',
  plan: 'Your personal plan',
  // offer: 'Your offer',
  // pricing: 'Choose your plan',
  complete: 'Next steps',
}

export function FlowShell({ children }: { children: React.ReactNode }) {
  const { step: id, go, ready } = useFlow()
  useEffect(() => {
    if (ready) trackEvent(GA_EVENT.SCREEN_VIEW, { [GA_PARAM.SCREEN_NAME]: id })
  }, [ready, id])
  const isQuiz = questionNumber(id) > 0 || id === 'break1' || id === 'break2'
  const number = id === 'break1' ? 5 : id === 'break2' ? 10 : questionNumber(id)
  const completed = id.startsWith('break') ? number : number - 1
  const back = !['who', 'loading', 'complete'].includes(id)
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col overflow-x-clip">
      <header className="sticky top-0 z-20 bg-[#f4f2f7] px-6 pb-5 pt-3">
        <div className="mb-4 grid min-h-11 grid-cols-[44px_1fr_auto] items-center">
          {back ? (
            <button
              type="button"
              aria-label="Back"
              onClick={() => {
                trackEvent(GA_EVENT.BACK_CLICK, { [GA_PARAM.SCREEN_NAME]: id })
                go(previousStep(id))
              }}
              className="surface grid size-11 place-items-center rounded-full text-[#231f33]"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 5 8 12l7 7" />
              </svg>
            </button>
          ) : (
            <span />
          )}
          <span />
          {isQuiz && (
            <span className="brand-font whitespace-nowrap text-right text-base font-semibold tabular-nums text-[#5f5a72]">
              {number} / 15
            </span>
          )}
        </div>
        {isQuiz ? (
          <div
            className="flex gap-1.5"
            role="progressbar"
            aria-label="Quiz progress"
            aria-valuemin={0}
            aria-valuemax={15}
            aria-valuenow={completed}
            aria-valuetext={`${completed} of 15 questions completed`}
          >
            {steps.map((stage, i) => (
              <span
                key={stage}
                className="h-1 flex-1 overflow-hidden rounded-full bg-[#ddd7e8]"
                title={stage}
              >
                <span
                  className="block h-full origin-left bg-[#5b45c8] transition-transform duration-300"
                  style={{
                    transform: `scaleX(${Math.min(1, Math.max(0, (completed - i * 5) / 5))})`,
                  }}
                />
              </span>
            ))}
          </div>
        ) : (
          <p className="brand-font text-center text-sm text-[#5f5a72]">{statuses[id] || ''}</p>
        )}
      </header>
      <main className="screen-enter flex flex-1 flex-col px-6 pb-8 pt-4" key={id}>
        {children}
      </main>
    </div>
  )
}
