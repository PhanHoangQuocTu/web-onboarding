'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/gtag'
import { previousStep, questionNumber, questions } from '@/lib/quiz'
import { useFlow } from './FlowProvider'
import { GA_EVENT, GA_PARAM } from '@/utils/const'

const steps = ['About you', 'Your practice', 'Your plan']

export function FlowShell({ children }: { children: React.ReactNode }) {
  const { step: id, go, ready } = useFlow()
  useEffect(() => {
    if (ready) trackEvent(GA_EVENT.SCREEN_VIEW, { [GA_PARAM.SCREEN_NAME]: id })
  }, [ready, id])
  const total = questions.length
  const isQuiz = questionNumber(id) > 0 || id === 'break1' || id === 'break2'
  const number = id === 'break1' ? 5 : id === 'break2' ? 10 : questionNumber(id)
  const back = !['who', 'loading', 'pricing', 'complete'].includes(id)
  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[440px] flex-col overflow-x-clip">
      {id !== 'pricing' && (
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
                className={`surface grid place-items-center rounded-full text-[#231f33] ${id === 'email' ? 'size-8' : 'size-11'}`}
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
                {number} / {total}
              </span>
            )}
          </div>
          {isQuiz ? (
            <div
              className="flex gap-1.5"
              role="progressbar"
              aria-label="Quiz progress"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={number}
              aria-valuetext={`${number} of ${total} steps reached`}
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
                      transform: `scaleX(${Math.min(1, Math.max(0, (number - i * 5) / Math.min(5, total - i * 5)))})`,
                    }}
                  />
                </span>
              ))}
            </div>
          ) : null}
        </header>
      )}
      <main
        className={`screen-enter flex flex-1 flex-col px-6 pb-8 ${id === 'plan' || id === 'pricing' ? 'pt-10' : id === 'email' ? 'pt-0' : 'pt-4'}`}
        key={id}
      >
        {children}
      </main>
    </div>
  )
}
