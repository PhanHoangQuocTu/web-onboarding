'use client'

import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { trackEvent } from '@/lib/gtag'
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
  disabled = false,
}: {
  children: ReactNode
  onClick: () => void
  note?: string
  disabled?: boolean
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
        disabled={disabled}
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
