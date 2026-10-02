'use client'

import { useEffect } from 'react'
import { clickParams, trackEvent } from '@/lib/gtag'
import { previousStep, questionNumber, questions } from '@/lib/quiz'
import { useFlow } from './FlowProvider'
import { GA_ELEMENT, GA_EVENT, GA_PARAM } from '@/utils/const'

const steps = ['About you', 'Your practice', 'Your plan']

export function FlowShell({ children }: { children: React.ReactNode }) {
  const { step: id, go, ready, motion } = useFlow()
  useEffect(() => {
    if (ready) trackEvent(GA_EVENT.SCREEN_VIEW, { [GA_PARAM.SCREEN_NAME]: id })
  }, [ready, id])
  const total = questions.length
  const isQuiz = questionNumber(id) > 0 || id === 'break1' || id === 'break2'
  const number = id === 'break1' ? 5 : id === 'break2' ? 10 : questionNumber(id)
  const back = !['who', 'loading', 'pricing', 'complete'].includes(id)
  const isBreak = id === 'break1' || id === 'break2'
  const completed = isBreak ? number : questionNumber(id) > 0 ? number - 1 : total
  const bodyMotion = motion ? `body-${motion.phase}${motion.back ? '-back' : ''}` : ''
  return (
    <div className="screen-enter relative mx-auto flex min-h-dvh w-full max-w-[440px] flex-col overflow-x-clip">
      {id !== 'pricing' && (
        <header className="flow-head sticky top-0 z-20 bg-(--ground) px-6 pb-5 pt-3">
          <div className="-mx-1 mb-4 grid min-h-11 grid-cols-[44px_minmax(0,1fr)_44px] items-center">
            {back ? (
              <button
                type="button"
                aria-label="Back"
                onClick={() => {
                  trackEvent(GA_EVENT.BACK_CLICK, {
                    ...clickParams(GA_ELEMENT.BACK),
                    [GA_PARAM.SCREEN_NAME]: id,
                  })
                  go(previousStep(id), true)
                }}
                className="back-button grid size-11 place-items-center rounded-full p-0"
              >
                <span>
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
                </span>
              </button>
            ) : (
              <span />
            )}
            <span />
            {isQuiz && (
              <span className="brand-font col-start-3 whitespace-nowrap text-right text-base font-semibold tabular-nums text-(--muted)">
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
              aria-valuenow={completed}
              aria-valuetext={`${completed} of ${total} questions completed.${isBreak ? '' : ` Question ${number} of ${total}.`}`}
            >
              {steps.map((stage, i) => (
                <span
                  key={stage}
                  className="h-1 flex-1 overflow-hidden rounded-full bg-(--track)"
                  title={stage}
                >
                  <span
                    className="seg-fill block h-full origin-left bg-(--accent)"
                    style={{
                      transform: `scaleX(${Math.min(1, Math.max(0, (completed - i * 5) / Math.min(5, total - i * 5)))})`,
                    }}
                  />
                </span>
              ))}
            </div>
          ) : null}
        </header>
      )}
      <div className={`flex flex-1 flex-col ${motion ? 'pane-moving' : ''}`}>
        <main className={`flex flex-1 flex-col px-6 pb-8 pt-4 ${bodyMotion}`} key={id}>
          {children}
        </main>
      </div>
    </div>
  )
}
