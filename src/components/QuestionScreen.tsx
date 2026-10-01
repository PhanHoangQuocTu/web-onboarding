'use client'

import { useEffect, useRef, useState } from 'react'
import { useFlow } from './FlowProvider'
import { IconArt, TemplateArt } from './Art'
import { CheckIcon } from './CheckIcon'
import { Phrases, StickyAction } from './Ui'
import { nextStep, titleFor, type Question } from '@/lib/quiz'

const labelParts = (label: string) => {
  const match = label.match(/^(.*?)\s*\(([^)]+)\)$/)
  return match ? (
    <>
      {match[1]}
      <small className="block text-base font-normal text-[#5f5a72]">{match[2]}</small>
    </>
  ) : (
    label
  )
}

export function QuestionScreen({ question }: { question: Question }) {
  const { answers, setAnswer, go, ready } = useFlow()
  const [selected, setSelected] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  if (!ready) return null
  const title = titleFor(question, answers)
  const selectedValues = Array.isArray(answers[question.id])
    ? (answers[question.id] as string[])
    : []
  const choose = (value: string) => {
    if (question.kind === 'multi') {
      const on = !selectedValues.includes(value)
      const solo = value === question.none
      setAnswer(
        question.id,
        selectedValues
          .filter((item) => item !== value && !(on && (solo || item === question.none)))
          .concat(on ? [value] : []),
      )
      return
    }
    if (selected) return
    setSelected(value)
    setAnswer(question.id, value)
    timer.current = setTimeout(() => go(nextStep(question.id)), 400)
  }
  return (
    <>
      <h2>
        <Phrases text={title} />
      </h2>
      {question.lede && (
        <p className="mt-3 text-lg leading-snug text-[#5f5a72]">
          <Phrases text={question.lede} />
        </p>
      )}
      {question.extra === 'streak' && (
        <div className="surface mt-7 rounded-[32px] p-4">
          <div className="flex justify-between gap-0.5 min-[380px]:gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <span
                key={day}
                className="brand-font grid size-8 shrink-0 place-items-center rounded-full bg-[#5b45c8] text-base font-bold text-white min-[380px]:size-9"
              >
                {day}
              </span>
            ))}
          </div>
          <p className="mt-3 text-center text-base text-[#5f5a72]">
            One drawing a day, 7 days in a row.
          </p>
        </div>
      )}
      <div
        className={`flex flex-col gap-3 ${question.kind === 'tiles' ? 'mt-7' : 'mt-6'}`}
        role={question.kind === 'multi' ? 'group' : 'radiogroup'}
        aria-label={title.replaceAll('|', ' ')}
      >
        {question.options.map((option) => {
          const active =
            question.kind === 'multi'
              ? selectedValues.includes(option.value)
              : (selected || answers[question.id]) === option.value
          return (
            <button
              key={option.value}
              type="button"
              role={question.kind === 'multi' ? undefined : 'radio'}
              aria-checked={question.kind === 'multi' ? undefined : active}
              aria-pressed={question.kind === 'multi' ? active : undefined}
              onClick={() => choose(option.value)}
              className={`answer-card surface flex min-h-26 w-full items-center gap-4 rounded-[28px] p-4 text-left ${question.kind === 'tiles' ? 'min-h-[112px] rounded-[32px]' : ''}`}
            >
              {question.kind === 'tiles' ? (
                <TemplateArt name={option.icon} className="size-15 rounded-2xl!" />
              ) : (
                <span className="shrink-0 max-[359px]:[&>img]:size-16">
                  <IconArt name={option.icon} />
                </span>
              )}
              <span className="brand-font min-w-0 flex-1 text-xl font-semibold leading-snug text-[#231f33]">
                {labelParts(option.label)}
              </span>
              <span
                className={`radio ${question.kind === 'multi' ? 'square' : ''}`}
                aria-hidden="true"
              >
                <CheckIcon />
              </span>
            </button>
          )
        })}
      </div>
      {question.kind === 'tiles' && (
        <p className="mt-3 text-lg text-[#5f5a72]">Your plan is built around it.</p>
      )}
      {question.kind === 'multi' && (
        <StickyAction onClick={() => go(nextStep(question.id))}>Continue</StickyAction>
      )}
    </>
  )
}
