'use client'

import { useFlow } from './FlowProvider'
import { TemplateArt } from './Art'
import { CheckIcon } from './CheckIcon'
import { Chips, Phrases, PlanList, StickyAction } from './Ui'
import { makePlan, mode } from '@/lib/plan'

export function BreakScreen({ part }: { part: 1 | 2 }) {
  const { answers, go, ready } = useFlow()
  if (!ready) return null
  const plan = makePlan(answers)
  if (part === 1) {
    const who =
      { me: 'for yourself', child: 'for your child', both: 'for you and your child' }[
        String(answers.who)
      ] || 'for yourself'
    const goal =
      {
        gift: 'to make a personal gift',
        relax: 'to unwind after a long day',
        kids: 'to turn screen time into creative time',
        hobby: 'to build a daily hobby',
      }[String(answers.goal)] || 'to build a daily hobby'
    const love =
      {
        people: 'portraits and people',
        characters: 'anime and cartoon characters',
        animals: 'cute animals and pets',
        nature: 'flowers, food and cute objects',
      }[String(answers.draw)] || 'anime and cartoon characters'
    const level =
      { beginner: 'a beginner', amateur: 'an amateur', intermediate: 'an intermediate' }[
        String(answers.level)
      ] || 'a beginner'
    const cheer = (
      {
        talent: ['No talent needed.', 'You trace, your hand makes the art.'],
        time: ['Short on time?', 'One small drawing a day is enough.'],
        start: ['No talent needed.', 'You trace, your hand makes the art.'],
      } as Record<string, string[]>
    )[String(answers.block)] || [
      'You are in the right place.',
      'Every drawing is traced step by step.',
    ]
    return (
      <>
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="grid size-6 shrink-0 place-items-center rounded-full bg-[#5b45c8] text-base font-bold leading-none text-white"
          >
            <CheckIcon />
          </span>
          <p className="brand-font text-sm font-semibold uppercase tracking-wider text-[#4a36ae]">
            Part 1 of 3 done
          </p>
        </div>
        <h2 className="mt-3">
          <Phrases text="Nice to meet you." />
        </h2>
        <p className="brand-font mt-5 text-2xl font-semibold leading-snug text-[#231f33]">
          Drawing <mark className="marker-highlight">{who}</mark>,{' '}
          <mark className="marker-highlight">{goal}</mark>. Into{' '}
          <mark className="marker-highlight">{love}</mark>, starting as{' '}
          <mark className="marker-highlight">{level}</mark>.
        </p>
        <div className="mt-6 flex justify-between gap-2 rounded-[1.75rem] bg-[#f0f0f2] p-4">
          {plan.slice(0, 3).map((key, i) => (
            <TemplateArt
              key={`${key}-${i}`}
              name={key}
              className="min-w-0 max-w-24.5 flex-1 bg-transparent!"
            />
          ))}
        </div>
        <div className="mt-5 flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#5b45c8] text-white"
          >
            <CheckIcon />
          </span>
          <p className="min-w-0 flex-1 text-lg leading-[1.45] text-[#5f5a72]">
            <b className="text-[#231f33]">{cheer[0]}</b> {cheer[1]}
          </p>
        </div>
        <StickyAction onClick={() => go('device')}>Keep going</StickyAction>
      </>
    )
  }
  const photos =
    { mostly: 'Your own photos', mix: 'Photos and app templates', library: 'App templates' }[
      String(answers.photos)
    ] || 'App templates'
  return (
    <>
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="grid size-6 shrink-0 place-items-center rounded-full bg-[#5b45c8] text-base font-bold leading-none text-white"
        >
          <CheckIcon />
        </span>
        <p className="brand-font text-sm font-semibold uppercase tracking-wider text-[#4a36ae]">
          Part 2 of 3 done
        </p>
      </div>
      <h2 className="mt-3">
        <Phrases text="Your plan is taking shape." />
      </h2>
      <p className="mt-3 text-lg text-[#5f5a72]">
        <Phrases text="A first look. 5 more taps to finish it." />
      </p>
      <Chips items={[mode(answers), photos]} />
      <PlanList plan={plan} answers={answers} preview />
      <StickyAction onClick={() => go('time')} note="About a minute left.">
        Finish my plan
      </StickyAction>
    </>
  )
}
