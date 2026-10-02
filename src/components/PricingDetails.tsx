'use client'

import { useFlow } from './FlowProvider'
import { IconArt, TemplateArt } from './Art'
import { CheckIcon } from './CheckIcon'
import { duration, mode, skill, subject, usesPhotos } from '@/lib/plan'

const showcaseTemplates = [
  'catgirl',
  'lily',
  'elephant',
  'icecream',
  'unicorn',
  'turtle',
  'sunflower',
  'donut',
]

const values = (answers: ReturnType<typeof useFlow>['answers']) => {
  const frustrations = Array.isArray(answers.frust) ? answers.frust : []
  const has = (key: string) => frustrations.includes(key)
  const list = [
    { text: '1,000+ hand-drawn templates.', weight: 0 },
    {
      text: `Trace your own photos.${has('photofee') ? ' No extra fee.' : ''}`,
      weight: (has('photofee') ? 2 : 0) + (usesPhotos(answers) ? 1 : 0),
    },
    { text: 'No ads. Cancel anytime.', weight: has('ads') ? 2 : 0 },
    ...(has('hidden') ? [{ text: 'One clear price. No hidden charges.', weight: 2 }] : []),
  ]
  return list.sort((a, b) => b.weight - a.weight).map((item) => item.text)
}

const h3 = 'mb-2 text-2xl font-bold tracking-[-0.02em]'

export function ValuePanel() {
  const { answers } = useFlow()
  return (
    <section>
      <h3 className="mb-2 text-lg font-bold">Why you’ll love it</h3>
      <ul className="flex flex-col gap-2">
        {values(answers).map((value) => (
          <li key={value} className="flex items-center gap-2 text-lg leading-[1.4]">
            <span className="grid size-5.5 shrink-0 place-items-center rounded-full bg-(--accent) text-white">
              <CheckIcon />
            </span>
            {value}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function PricingDetails() {
  const { answers } = useFlow()
  const focus =
    {
      proportion: 'getting the proportions right',
      lines: 'confident, smooth line work',
      shading: 'shading and adding details',
    }[String(answers.skillup)] || 'confident, smooth line work'
  const style =
    {
      full: 'Step-by-step tracing',
      outline: 'Trace the outline, add your own details',
      reference: 'Reference mode',
    }[String(answers.style)] || 'Step-by-step tracing'
  const highlights = [
    [
      'lines',
      `Draw ${subject(answers).pro} in 7 days`,
      `One drawing a day, at ${skill(answers).chip} level.`,
    ],
    [
      answers.device === 'tablet' ? 'tablet' : 'phone',
      `${mode(answers)}, set up for you`,
      answers.device === 'tablet'
        ? 'Paper on the screen, lines shine through.'
        : 'Your camera puts the sketch on real paper.',
    ],
    [String(answers.style || 'full'), style, `Every drawing works on ${focus}.`],
    usesPhotos(answers)
      ? ['mostly', 'Your photos, turned into sketches', 'Trace one on Day 5.']
      : ['library', '1,000+ hand-drawn templates', 'From quick doodles to big pieces.'],
    [
      String(answers.time || 'mid'),
      duration(answers).chip,
      { daily: 'With a daily nudge.', three: 'With a nudge 3 times a week.' }[
        String(answers.remind)
      ] || 'Draw whenever suits you.',
    ],
  ]
  const faq = [
    [
      'How do I get my plan?',
      'Download the app and sign in with the email you pay with. Your plan is waiting.',
    ],
    ['When will I be charged?', 'Today. It renews at the end of each period until you cancel.'],
    [
      'How do I cancel?',
      'Anytime before it renews, from the link in your receipt email. You keep access until the period ends.',
    ],
    [
      'Do I need special equipment?',
      answers.device === 'tablet'
        ? 'Just your tablet, paper and a pencil. Lay the paper on the screen.'
        : 'Just your phone, paper and a pencil. A stand, a tall glass or a stack of books holds the phone.',
    ],
    [
      'Does it work on iPhone and Android?',
      'Yes. AR Sketch & Trace is on the App Store and Google Play.',
    ],
  ]
  return (
    <>
      <section className="mt-6">
        <h3 className={h3}>What’s in your plan</h3>
        <ul className="flex flex-col gap-3.5">
          {highlights.map(([icon, title, detail]) => (
            <li key={title} className="flex items-center gap-3.5">
              <IconArt name={icon} size={56} />
              <span>
                <b className="block text-lg text-(--ink)">{title}</b>
                <span className="text-base text-(--muted)">{detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-6">
        <h3 className={h3}>Inside the app</h3>
        <div className="marquee -mx-6 overflow-hidden">
          <div className="marquee-track flex w-max gap-2 pl-6">
            {[false, true].map((copy) =>
              showcaseTemplates.map((name) => (
                <div
                  key={`${name}-${copy}`}
                  aria-hidden={copy || undefined}
                  className="size-32 shrink-0 overflow-hidden rounded-xl border border-(--line) bg-white"
                >
                  <TemplateArt name={name} className="size-full rounded-none bg-transparent!" />
                </div>
              )),
            )}
          </div>
        </div>
      </section>
      <section className="mt-6">
        <h3 className={h3}>What happens next</h3>
        <ol className="flex list-decimal flex-col gap-2 pl-[22px] text-lg">
          <li>Download AR Sketch & Trace</li>
          <li>Sign in with your email</li>
          <li>Open Day 1 and grab a pencil</li>
        </ol>
      </section>
      <section className="faq mt-6">
        <h3 className={h3}>Questions</h3>
        {faq.map(([question, answer]) => (
          <details key={question} className="border-t border-(--hair) py-3.5 last:border-b">
            <summary className="flex cursor-pointer justify-between gap-3 text-lg font-bold text-(--ink)">
              {question}
            </summary>
            <p className="mt-2 text-base text-(--muted)">{answer}</p>
          </details>
        ))}
      </section>
      <p className="mt-6 text-center text-sm leading-normal text-(--muted)">
        Renews automatically until you cancel. Cancel anytime before the renewal date.
      </p>
    </>
  )
}
