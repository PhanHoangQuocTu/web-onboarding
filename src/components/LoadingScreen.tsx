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

  return (
    <div className="flex flex-1 flex-col items-center justify-center pb-10">
      <div className="relative size-56">
        <svg className="size-full -rotate-90" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="86" fill="none" stroke="#ddd7e8" strokeWidth="12" />
          <circle
            cx="100"
            cy="100"
            r="86"
            fill="none"
            stroke="#5b45c8"
            strokeWidth="12"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray="100"
            strokeDashoffset={100 - progress}
          />
        </svg>
        <b className="brand-font absolute inset-0 flex items-center justify-center text-5xl leading-none text-[#231f33] tabular-nums">
          {progress}
          <span className="ml-0.5 text-2xl">%</span>
        </b>
      </div>
      <p className="brand-font text-center mt-8 text-sm font-semibold uppercase tracking-wider text-[#4a36ae]">
        Building your plan
      </p>

      <ul className="mx-auto mt-2 w-fit">
        {lines.map((line, i) => (
          <li
            key={line}
            className="flex min-h-11 items-center gap-3.5 font-semibold text-[#231f33]"
          >
            <span
              className={`grid text-xs size-6 place-items-center rounded-full border-[.1875rem] ${progress >= (i + 1) * 33.33 ? 'border-[#5b45c8] bg-[#5b45c8] text-white' : progress >= i * 33.33 ? 'loading-spin border-[#ddd7e8] border-t-[#5b45c8]' : 'border-[#ddd7e8]'}`}
            >
              {progress >= (i + 1) * 33.33 && <CheckIcon />}
            </span>

            {line}
          </li>
        ))}
      </ul>
    </div>
  )
}
