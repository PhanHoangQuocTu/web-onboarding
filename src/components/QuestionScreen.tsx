'use client'

import { useEffect, useRef, useState } from 'react'
import { useFlow } from './FlowProvider'
import { IconArt } from './Art'
import { CheckIcon } from './CheckIcon'
import { DrawTiles } from './DrawTiles'
import { Phrases, StickyAction } from './Ui'
import { trackEvent } from '@/lib/gtag'
import { nextStep, titleFor, type Question } from '@/lib/quiz'
import { GA_EVENT, GA_PARAM } from '@/utils/const'

const labelParts = (label: string) => {
  const match = label.match(/^(.*?)\s*\(([^)]+)\)$/)
  return match ? (
    <>
      {match[1]}
      <small className="mt-0.5 block text-base font-normal text-(--muted)">{match[2]}</small>
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
      trackEvent(GA_EVENT.ANSWER_SELECT, {
        [GA_PARAM.QUESTION_ID]: question.id,
        [GA_PARAM.ANSWER_VALUE]: value,
        [GA_PARAM.SELECTED]: on,
      })
      setAnswer(
        question.id,
        selectedValues
          .filter((item) => item !== value && !(on && (solo || item === question.none)))
          .concat(on ? [value] : []),
      )
      return
    }
    if (selected) return
    trackEvent(GA_EVENT.ANSWER_SELECT, {
      [GA_PARAM.QUESTION_ID]: question.id,
      [GA_PARAM.ANSWER_VALUE]: value,
      [GA_PARAM.SELECTED]: true,
    })
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
        <p className="lede">
          <Phrases text={question.lede} />
        </p>
      )}
      {question.kind === 'tiles' ? (
        <DrawTiles
          options={question.options}
          selected={selected || String(answers[question.id] || '')}
          onChoose={choose}
          title={title}
        />
      ) : (
        <div
          className="mt-6 flex flex-col gap-3"
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
                className="answer-card surface flex w-full items-center gap-4 rounded-[28px] py-4 pl-4 pr-5 text-left"
              >
                <span className="shrink-0 max-[360px]:[&>img]:size-10">
                  <IconArt name={option.icon} />
                </span>
                <span className="min-w-0 flex-1 text-xl font-semibold leading-[1.35] text-(--ink)">
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
      )}
      {question.kind === 'multi' && (
        <StickyAction onClick={() => go(nextStep(question.id))}>Continue</StickyAction>
      )}
    </>
  )
}
