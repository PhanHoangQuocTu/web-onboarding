'use client'

import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { trackEvent } from '@/lib/gtag'
import { categoryLabel, goalLabel, templates } from '@/lib/plan'
import type { Answers } from '@/lib/quiz'
import { TemplateArt } from './Art'
import { useFlow } from './FlowProvider'
import { GA_EVENT, GA_PARAM, GA_VALUE } from '@/utils/const'

export function Phrases({ text }: { text: string }) {
  return (
    <>
      <span className="block">{text}</span>
    </>
  )
}
export function Button({
  children,
  onClick,
  className = '',
  disabled = false,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`primary-button w-full disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  )
}
export function StickyAction({
  children,
  onClick,
  note,
}: {
  children: ReactNode
  onClick: () => void
  note?: string
}) {
  const { step } = useFlow()
  const footer = (
    <div className="glass-footer fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[440px] px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-5">
      <Button
        onClick={() => {
          trackEvent(GA_EVENT.CTA_CLICK, {
            [GA_PARAM.BUTTON_TEXT]:
              typeof children === 'string' ? children : GA_VALUE.STICKY_ACTION,
            [GA_PARAM.SCREEN_NAME]: step,
          })
          onClick()
        }}
      >
        {children}
      </Button>
      {note && <p className="mt-2 text-center text-sm text-[#5f5a72]">{note}</p>}
    </div>
  )

  return (
    <>
      <div
        aria-hidden="true"
        className={`mt-auto shrink-0 ${note ? 'h-[calc(129px+env(safe-area-inset-bottom))]' : 'h-[calc(100px+env(safe-area-inset-bottom))]'}`}
      />
      {typeof document !== 'undefined' && createPortal(footer, document.body)}
    </>
  )
}
export function Chips({ items }: { items: string[] }) {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="surface brand-font rounded-full px-3.5 py-2 text-base font-semibold text-[#231f33]"
        >
          {item}
        </span>
      ))}
    </div>
  )
}
export function PlanList({
  plan,
  answers,
  preview = false,
}: {
  plan: string[]
  answers: Answers
  preview?: boolean
}) {
  return (
    <ol className="mt-5 flex flex-col gap-2">
      {(preview ? plan.slice(0, 3) : plan).map((key, i) => (
        <li
          key={`${key}-${i}`}
          className={`surface flex items-center gap-3.5 rounded-[20px] p-2 pr-4 ${!preview && i === plan.length - 1 ? 'ring-2 ring-[#5b45c8]' : ''}`}
        >
          <TemplateArt name={key} className="size-12" />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="brand-font block text-sm font-semibold uppercase tracking-wide text-[#4a36ae]">
              Day {i + 1}
              {!preview && i === plan.length - 1 ? ` · ${goalLabel(answers)}` : ''}
            </span>
            <b className="text-lg text-[#231f33]">{templates[key].name}</b>
          </span>
          <small className="text-right text-sm text-[#5f5a72]">{categoryLabel(key)}</small>
        </li>
      ))}
      {preview &&
        [4, 5, 6, 7].map((day) => (
          <li
            key={day}
            className="flex items-center gap-3.5 rounded-[20px] border border-dashed border-[#d3ccdf] p-2 pr-4"
          >
            <span className="grid size-12 place-items-center rounded-xl bg-[#f0f0f2] text-[#5f5a72]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M13.9998 8.75H5.99984C4.98731 8.75 4.1665 9.57081 4.1665 10.5833V15.25C4.1665 16.2625 4.98731 17.0833 5.99984 17.0833H13.9998C15.0124 17.0833 15.8332 16.2625 15.8332 15.25V10.5833C15.8332 9.57081 15.0124 8.75 13.9998 8.75Z"
                  fill="#5F5A72"
                />
                <path
                  d="M6.6665 8.74998V6.66665C6.6665 5.78259 7.01769 4.93474 7.64281 4.30962C8.26794 3.6845 9.11578 3.33331 9.99984 3.33331C10.8839 3.33331 11.7317 3.6845 12.3569 4.30962C12.982 4.93474 13.3332 5.78259 13.3332 6.66665V8.74998"
                  stroke="#5F5A72"
                  strokeWidth="2"
                />
              </svg>
            </span>
            <span className="leading-tight">
              <span className="brand-font block text-sm font-semibold uppercase tracking-wide text-[#5f5a72]">
                Day {day}
              </span>
              <b className="text-base text-[#5f5a72]">Unlocks at the end</b>
            </span>
          </li>
        ))}
    </ol>
  )
}
