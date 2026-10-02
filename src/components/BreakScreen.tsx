'use client'

import type { CSSProperties } from 'react'
import { useFlow } from './FlowProvider'
import { StickyAction } from './Ui'
import type { Answers } from '@/lib/quiz'

const drawImages = ['people', 'characters', 'animals', 'nature']

function firstCopy(answers: Answers) {
  return (
    {
      talent: [
        'A lot of people feel that way at first.',
        `Follow the lines one step at a time. By the last step, you’ve drawn this yourself.`,
      ],
      time: [
        'Short on time? That’s fine.',
        `Do a few steps today and finish this drawing tomorrow.`,
      ],
      start: [
        'Then let us pick for you.',
        'Your plan shows what to draw and where to start. Just follow the first line.',
      ],
    }[String(answers.block)] || ['One line at a time.', 'Follow the drawing step by step.']
  )
}

const secondCopy = (answers: Answers) =>
  ({
    results: [
      'One small win a day.',
      'Seven days, one drawing each day. Day 1 is ready when you are.',
    ],
    big: [
      'Seven days to one finished piece.',
      'Your last day is the biggest drawing in your plan.',
    ],
    streaks: ['A streak you can see.', 'Finish a drawing, light up the day. Day 1 starts it.'],
  })[String(answers.motive)] || [
    'One drawing a day.',
    'Seven days, one drawing each day. Day 1 is ready when you are.',
  ]

export function BreakScreen({ part }: { part: 1 | 2 }) {
  const { answers, go, ready } = useFlow()
  if (!ready) return null
  if (part === 1) {
    const draw = drawImages.includes(String(answers.draw)) ? String(answers.draw) : 'characters'
    const [title, lede] = firstCopy(answers)
    return (
      <>
        <div className="rise-children">
          <div
            role="img"
            aria-label="Pencil sketch example"
            className="mb-6 aspect-square w-full overflow-hidden rounded-2xl bg-white shadow-[0_0_0_1px_var(--hair)]"
          >
            <img
              src={`/art/draw/break1-${draw}.webp`}
              width={720}
              height={720}
              alt=""
              decoding="async"
              className="draw-in size-full object-cover"
            />
          </div>
          <h2>{title}</h2>
          <p className="lede">{lede}</p>
        </div>
        <StickyAction onClick={() => go('device')}>Keep going</StickyAction>
      </>
    )
  }
  const [title, lede] = secondCopy(answers)
  return (
    <>
      <div className="rise-children">
        <div
          role="img"
          aria-label="Seven days, one drawing each day. Day 1 is first."
          className="mb-6 flex flex-col gap-3.5 rounded-2xl bg-white px-4 pb-[22px] pt-7 shadow-[0_0_0_1px_var(--hair)]"
        >
          <ol className="flex justify-between">
            {Array.from({ length: 7 }, (_, index) => (
              <li
                key={index}
                className="pop"
                style={{ '--d': `${(0.2 + (index + 1) * 0.12).toFixed(2)}s` } as CSSProperties}
              >
                <span
                  className={`brand-font grid size-[38px] place-items-center rounded-full border-2 border-(--accent) text-base font-bold ${index === 0 ? 'bg-(--accent) text-white' : 'bg-white text-(--accent-text)'}`}
                >
                  {index + 1}
                </span>
              </li>
            ))}
          </ol>
          <p className="brand-font flex justify-between text-sm font-semibold uppercase tracking-[0.04em] text-(--muted)">
            <span>Day 1</span>
            <span>Day 7</span>
          </p>
        </div>
        <h2>{title}</h2>
        <p className="lede">{lede}</p>
      </div>
      <StickyAction onClick={() => go('time')}>Almost there</StickyAction>
    </>
  )
}
