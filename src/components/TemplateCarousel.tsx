'use client'

import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { templates } from '@/lib/plan'
import { TemplateArt } from './Art'
import { clickParams, trackEvent } from '@/lib/gtag'
import { GA_ELEMENT, GA_EVENT, GA_PARAM, GA_VALUE } from '@/utils/const'

const slideWidth = 144
const slideGap = 12

export function TemplateCarousel({ names }: { names: string[] }) {
  const viewport = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; scrollLeft: number } | null>(null)
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeIndex, setActiveIndex] = useState(1)

  useLayoutEffect(() => {
    if (viewport.current && names.length > 1) viewport.current.scrollLeft = slideWidth + slideGap
    return () => {
      if (snapTimer.current) clearTimeout(snapTimer.current)
    }
  }, [names.length])

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    drag.current = null
    const element = event.currentTarget
    const target =
      Math.round(element.scrollLeft / (slideWidth + slideGap)) * (slideWidth + slideGap)
    element.scrollTo({ left: target, behavior: 'smooth' })
    snapTimer.current = setTimeout(() => {
      element.style.scrollSnapType = ''
      snapTimer.current = null
    }, 400)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const moveSlide = (direction: -1 | 1) => {
    const element = viewport.current
    if (!element) return
    const dir = direction === 1 ? GA_VALUE.NEXT : GA_VALUE.PREVIOUS
    trackEvent(GA_EVENT.CAROUSEL_CLICK, {
      ...clickParams(GA_ELEMENT.CAROUSEL, dir),
      [GA_PARAM.DIRECTION]: dir,
    })
    const current = Math.round(element.scrollLeft / (slideWidth + slideGap))
    element.scrollTo({
      left: (current + direction) * (slideWidth + slideGap),
      behavior: 'smooth',
    })
  }

  return (
    <div className="relative -mx-6 overflow-hidden">
      <div
        ref={viewport}
        role="region"
        aria-roledescription="carousel"
        aria-label="Drawing templates. Swipe, scroll, or use arrow keys to browse."
        tabIndex={0}
        className="template-carousel flex cursor-grab snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain select-none active:cursor-grabbing"
        onScroll={(event) => {
          setActiveIndex(Math.round(event.currentTarget.scrollLeft / (slideWidth + slideGap)))
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
          event.preventDefault()
          moveSlide(event.key === 'ArrowRight' ? 1 : -1)
        }}
        onPointerDown={(event) => {
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
        {names.map((name, index) => (
          <div
            key={name}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${names.length}: ${templates[name].name}`}
            className="size-36 shrink-0 snap-start overflow-hidden rounded-[14px] border border-[#d3ccdf] bg-white"
          >
            <TemplateArt name={name} className="size-full rounded-[14px]! bg-white!" />
          </div>
        ))}
      </div>
      {names.length > 2 && (
        <>
          <button
            type="button"
            aria-label="Previous templates"
            disabled={activeIndex <= 0}
            onClick={() => moveSlide(-1)}
            className="absolute top-1/2 left-2 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-[#d3ccdf] bg-white/95 text-2xl leading-none text-[#231f33] shadow-sm disabled:opacity-40 min-[640px]:grid"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            aria-label="Next templates"
            disabled={activeIndex >= names.length - 2}
            onClick={() => moveSlide(1)}
            className="absolute top-1/2 right-2 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-[#d3ccdf] bg-white/95 text-2xl leading-none text-[#231f33] shadow-sm disabled:opacity-40 min-[640px]:grid"
          >
            <span aria-hidden="true">›</span>
          </button>
        </>
      )}
    </div>
  )
}
