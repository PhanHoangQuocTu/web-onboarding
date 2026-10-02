'use client'

import { useEffect, useState } from 'react'
import { useFlow } from './FlowProvider'
import { CheckIcon } from './CheckIcon'

const lines = ['Checking your setup', 'Picking your drawings', 'Building your 7-day plan']
export function LoadingScreen() {
  const { go } = useFlow()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const started = Date.now()
    const timer = setInterval(
      () => setProgress(Math.min(100, Math.round(((Date.now() - started) / 4200) * 100))),
      60,
    )
    const next = setTimeout(() => go('plan'), 4700)

    return () => {
      clearInterval(timer)
      clearTimeout(next)
    }
  }, [go])

  const current = Math.min(lines.length - 1, Math.floor((progress / 100) * lines.length))

  return (
    <div className="flex flex-col items-center pt-7">
      <div className="relative size-50">
        <svg className="size-full -rotate-90" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="86" fill="none" stroke="var(--track)" strokeWidth="12" />
          <circle
            cx="100"
            cy="100"
            r="86"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="12"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray="100"
            strokeDashoffset={100 - progress}
            className="transition-[stroke-dashoffset] duration-100 ease-linear"
          />
        </svg>
        <b className="brand-font absolute inset-0 grid place-items-center text-[64px] font-bold tracking-[-0.035em] text-(--ink) tabular-nums">
          {progress}%
        </b>
      </div>
      <p className="eyebrow mt-8">Building your plan</p>

      <ul className="mt-2 flex flex-col gap-1.5 self-center">
        {lines.map((line, i) => {
          const state = i < current || progress >= 100 ? 'ok' : i === current ? 'on' : ''
          return (
            <li
              key={line}
              className={`flex min-h-11 items-center gap-3.5 text-lg font-semibold transition-colors duration-200 ${state ? 'text-(--ink)' : 'text-(--quiet)'}`}
            >
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full ${state === 'ok' ? 'bg-(--accent) text-white' : state === 'on' ? 'loading-spin border-[3px] border-(--track) border-t-(--accent)' : 'border-[3px] border-(--track)'}`}
              >
                {state === 'ok' && <CheckIcon strokeWidth={2.4} />}
              </span>
              {line}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
