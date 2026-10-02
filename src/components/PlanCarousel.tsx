'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { clickParams, trackEvent } from '@/lib/gtag'
import { templates } from '@/lib/plan'
import { GA_EVENT, GA_PARAM } from '@/utils/const'
import { TemplateArt } from './Art'

const chevron = (d: string) => (
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
    <path d={d} />
  </svg>
)

export function PlanCarousel({
  plan,
  onAllRevealed,
}: {
  plan: string[]
  onAllRevealed: () => void
}) {
  const rail = useRef<HTMLDivElement>(null)
  const stopped = useRef(false)
  const lastViewed = useRef(-1)
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const drag = useRef<{ x: number; scrollLeft: number } | null>(null)
  const [revealed, setRevealed] = useState<boolean[]>(() => plan.map(() => false))
  const [current, setCurrent] = useState(0)
  const name = (key: string) => templates[key]?.name || 'Your drawing'

  const nearest = () => {
    const element = rail.current
    if (!element) return { index: 0, gap: Infinity }
    const mid = element.scrollLeft + element.clientWidth / 2
    let index = 0
    let gap = Infinity
    Array.from(element.children).forEach((child, i) => {
      const card = child as HTMLElement
      const d = Math.abs(card.offsetLeft + card.offsetWidth / 2 - mid)
      if (d < gap) {
        gap = d
        index = i
      }
    })
    return { index, gap }
  }

  const reveal = useCallback((index: number, scroll = true) => {
    const element = rail.current
    const card = element?.children[index] as HTMLElement | undefined
    if (!element || !card) return
    if (scroll) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      element.scrollTo({
        left: card.offsetLeft - (element.clientWidth - card.offsetWidth) / 2,
        behavior: reduced ? 'auto' : 'smooth',
      })
    }
    setRevealed((all) => (all[index] ? all : all.map((on, i) => on || i === index)))
  }, [])

  // Autoplay calls reveal() directly; only user-driven views are tracked.
  const view = (index: number, via: 'swipe' | 'card' | 'prev' | 'next', scroll = true) => {
    if (index !== lastViewed.current) {
      lastViewed.current = index
      trackEvent(GA_EVENT.PLAN_DAY_VIEW, {
        ...clickParams(`day_${via}`, index + 1),
        [GA_PARAM.DAY_INDEX]: index + 1,
        [GA_PARAM.VIA]: via,
      })
    }
    reveal(index, scroll)
  }

  useEffect(() => {
    if (revealed.every(Boolean)) onAllRevealed()
  }, [revealed, onAllRevealed])

  const count = plan.length
  useEffect(() => {
    stopped.current = false
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const timer = setTimeout(() => setRevealed(Array.from({ length: count }, () => true)), 0)
      return () => clearTimeout(timer)
    }
    const timers = Array.from({ length: count }, (_, index) =>
      setTimeout(
        () => {
          if (!stopped.current) reveal(index)
        },
        550 + index * 650,
      ),
    )
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(settle.current)
    }
  }, [count, reveal])

  const stop = () => {
    stopped.current = true
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    drag.current = null
    const element = event.currentTarget
    element.style.scrollSnapType = ''
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId)
  }

  const navClass =
    'reveal-nav absolute top-1/2 z-[2] -mt-[18px] grid size-9 place-items-center rounded-full bg-white/72 p-0 text-(--primary) shadow-[0_0_0_1px_var(--hair)]'

  return (
    <div className="relative -mx-4 mt-5">
      <div
        ref={rail}
        tabIndex={0}
        aria-label="Your seven day drawing plan"
        className="plan-rail flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain"
        onScroll={() => {
          setCurrent(nearest().index)
          if (!stopped.current) return
          clearTimeout(settle.current)
          settle.current = setTimeout(() => {
            const { index, gap } = nearest()
            if (gap < 24) view(index, 'swipe', false)
          }, 140)
        }}
        onWheel={stop}
        onKeyDown={stop}
        onTouchStart={stop}
        onPointerDown={(event) => {
          stop()
          if (event.pointerType !== 'mouse' || event.button !== 0) return
          event.currentTarget.style.scrollSnapType = 'none'
          drag.current = { x: event.clientX, scrollLeft: event.currentTarget.scrollLeft }
        }}
        onPointerMove={(event) => {
          if (!drag.current) return
          const dx = event.clientX - drag.current.x
          if (Math.abs(dx) > 4 && !event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.setPointerCapture(event.pointerId)
          event.currentTarget.scrollLeft = drag.current.scrollLeft - dx
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {plan.map((key, index) => (
          <button
            key={`${key}-${index}`}
            type="button"
            aria-expanded={revealed[index]}
            aria-label={
              revealed[index]
                ? `Day ${index + 1}, ${name(key)}`
                : `Reveal Day ${index + 1}, ${name(key)}`
            }
            onClick={() => {
              stop()
              view(index, 'card')
            }}
            className="reveal-day relative h-[364px] snap-center snap-always rounded-[28px] border-0 bg-transparent p-0 text-left text-(--ink)"
          >
            <span
              className="reveal-face reveal-back brand-font items-center justify-center bg-(--accent) text-2xl font-bold text-white"
              aria-hidden="true"
            >
              Day {index + 1}
            </span>
            <span className="reveal-face reveal-front flex-col items-stretch gap-3.5 bg-white p-3">
              <span
                className="grid min-h-0 flex-1 place-items-center overflow-hidden rounded-2xl bg-white"
                aria-hidden="true"
              >
                {key === 'photo' ? (
                  <img
                    src="/art/icons/camera.webp"
                    width={200}
                    height={200}
                    alt=""
                    className="h-auto w-[60%] object-contain"
                  />
                ) : (
                  <TemplateArt name={key} className="size-full rounded-none bg-transparent!" />
                )}
              </span>
              <span className="flex flex-col gap-1.5 px-1.5">
                <b className="text-sm uppercase tracking-[0.05em] text-(--accent-text)">
                  Day {index + 1}
                </b>
                <strong className="brand-font text-2xl leading-[1.1]">{name(key)}</strong>
              </span>
            </span>
          </button>
        ))}
      </div>
      {current > 0 && (
        <button
          type="button"
          aria-label="Previous day"
          onClick={() => {
            stop()
            view(Math.max(0, current - 1), 'prev')
          }}
          className={`${navClass} left-3.5`}
        >
          {chevron('M15 5 8 12l7 7')}
        </button>
      )}
      {current < plan.length - 1 && (
        <button
          type="button"
          aria-label="Next day"
          onClick={() => {
            stop()
            view(Math.min(plan.length - 1, current + 1), 'next')
          }}
          className={`${navClass} right-3.5`}
        >
          {chevron('m9 5 7 7-7 7')}
        </button>
      )}
    </div>
  )
}
