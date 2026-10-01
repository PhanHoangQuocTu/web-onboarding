'use client'

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { templates } from '@/lib/plan'
import { TemplateArt } from './Art'

const slideGap = 16
const stride = (element: HTMLDivElement) => {
  const firstCard = element.firstElementChild as HTMLElement | null
  return (firstCard?.offsetWidth || 304) + slideGap
}

export function PlanCarousel({ plan }: { plan: string[] }) {
  const viewport = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; scrollLeft: number } | null>(null)
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tourTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const tourStopped = useRef(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [revealedThrough, setRevealedThrough] = useState(-1)
  const planLength = plan.length
  const planKey = plan.join('|')

  useEffect(() => {
    tourStopped.current = false
    let observer: IntersectionObserver | null = null
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      tourTimers.current = [setTimeout(() => setRevealedThrough(planLength - 1), 0)]
    } else {
      const startTour = () => {
        if (tourStopped.current) return
        tourTimers.current = Array.from({ length: planLength }, (_, index) => [
          setTimeout(() => {
            if (tourStopped.current) return
            const element = viewport.current
            if (element) element.scrollTo({ left: index * stride(element), behavior: 'smooth' })
          }, index * 650),
          setTimeout(
            () => {
              if (!tourStopped.current) setRevealedThrough(index)
            },
            index * 650 + 160,
          ),
        ]).flat()
      }
      const element = viewport.current
      if (element && 'IntersectionObserver' in window) {
        observer = new IntersectionObserver(
          (entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return
            observer?.disconnect()
            startTour()
          },
          { threshold: 0.25 },
        )
        observer.observe(element)
      } else {
        startTour()
      }
    }
    return () => {
      tourStopped.current = true
      observer?.disconnect()
      tourTimers.current.forEach(clearTimeout)
      tourTimers.current = []
      if (snapTimer.current) clearTimeout(snapTimer.current)
    }
  }, [planKey, planLength])

  const stopTour = () => {
    if (tourStopped.current) return
    tourStopped.current = true
    tourTimers.current.forEach(clearTimeout)
    tourTimers.current = []
    setRevealedThrough(planLength - 1)
  }

  const moveTo = (index: number) => {
    const element = viewport.current
    if (!element) return
    element.scrollTo({
      left: Math.max(0, Math.min(plan.length - 1, index)) * stride(element),
      behavior: 'smooth',
    })
  }

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    drag.current = null
    const element = event.currentTarget
    moveTo(Math.round(element.scrollLeft / stride(element)))
    snapTimer.current = setTimeout(() => {
      element.style.scrollSnapType = ''
      snapTimer.current = null
    }, 400)
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId)
  }

  const arrowClass =
    'absolute top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-[#e5e0ed] bg-white/90 text-[#8b829e] shadow-sm transition-colors hover:text-[#4a36ae]'

  return (
    <div className="relative -mx-6 mt-7 overflow-hidden">
      <div
        ref={viewport}
        role="region"
        aria-roledescription="carousel"
        aria-label="Your seven-day drawing plan"
        tabIndex={0}
        className="plan-carousel flex cursor-grab snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain select-none active:cursor-grabbing"
        onScroll={(event) => {
          setActiveIndex(Math.round(event.currentTarget.scrollLeft / stride(event.currentTarget)))
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
          event.preventDefault()
          stopTour()
          moveTo(
            Math.round(event.currentTarget.scrollLeft / stride(event.currentTarget)) +
              (event.key === 'ArrowRight' ? 1 : -1),
          )
        }}
        onWheel={stopTour}
        onPointerDown={(event) => {
          stopTour()
          if (event.pointerType !== 'mouse' || event.button !== 0) return
          event.preventDefault()
          if (snapTimer.current) clearTimeout(snapTimer.current)
          event.currentTarget.style.scrollSnapType = 'none'
          drag.current = { x: event.clientX, scrollLeft: event.currentTarget.scrollLeft }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          if (!drag.current) return
          event.currentTarget.scrollLeft =
            drag.current.scrollLeft - (event.clientX - drag.current.x)
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {plan.map((key, index) => (
          <article
            key={`${key}-${index}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`Day ${index + 1} of ${plan.length}: ${templates[key]?.name || 'Your drawing'}`}
            className="plan-day-card aspect-[304/396] shrink-0 snap-center"
            style={{ width: 'var(--plan-card-width)' }}
          >
            <div
              className="plan-day-card-inner relative size-full rounded-[30px] shadow-[0_12px_24px_rgba(35,31,51,0.08)]"
              data-revealed={index <= revealedThrough}
            >
              <div
                className="plan-day-card-face absolute inset-0 grid place-items-center overflow-hidden rounded-[30px] bg-[#5b45c8]"
                aria-hidden="true"
              >
                <span className="brand-font text-2xl font-bold text-white">Day {index + 1}</span>
              </div>
              <div className="plan-day-card-face plan-day-card-front absolute inset-0 flex flex-col overflow-hidden rounded-[30px] border border-[#ebe8f0] bg-white">
                <div className="grid min-h-0 flex-1 place-items-center">
                  {key === 'photo' ? (
                    <img
                      src="/art/icons/camera.webp"
                      width={200}
                      height={200}
                      alt=""
                      className="h-auto w-[72%] max-w-[200px] object-contain"
                    />
                  ) : (
                    <TemplateArt name={key} className="w-[90%] max-w-[268px] bg-transparent!" />
                  )}
                </div>
                <div className="px-5 pb-5">
                  <span className="brand-font text-sm font-bold uppercase tracking-wide text-[#4a36ae]">
                    Day {index + 1}
                  </span>
                  <h4 className="brand-font truncate text-2xl font-bold leading-tight text-[#231f33]">
                    {templates[key]?.name || 'Your drawing'}
                  </h4>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      {activeIndex > 0 && (
        <button
          type="button"
          aria-label="Previous day"
          onClick={() => {
            stopTour()
            moveTo(activeIndex - 1)
          }}
          className={`${arrowClass} left-4`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="m12 4-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
      {activeIndex < plan.length - 1 && (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#f4f2f7] to-transparent"
          />
          <button
            type="button"
            aria-label="Next day"
            onClick={() => {
              stopTour()
              moveTo(activeIndex + 1)
            }}
            className={`${arrowClass} right-4`}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="m8 4 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}
