'use client'

import { useFlow } from './FlowProvider'
import { IconArt } from './Art'
import { CheckIcon } from './CheckIcon'
import { TemplateCarousel } from './TemplateCarousel'
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
  const list = [
    'No ads. Cancel anytime.',
    `Trace your own photos.${frustrations.includes('photofee') ? ' No extra fee.' : ''}`,
    '1,000+ hand-drawn templates.',
  ]
  if (frustrations.includes('hidden')) list.push('One clear price. No hidden charges.')
  return list
}

export function ValuePanel() {
  const { answers } = useFlow()
  return (
    <div className="mt-6 rounded-4xl p-6">
      <h3 className="text-lg font-bold">Why you’ll love it</h3>
      <ul className="mt-3 space-y-2.5">
        {values(answers).map((value) => (
          <li key={value} className="flex gap-2.5 leading-snug">
            <span className="grid size-5.5 shrink-0 place-items-center rounded-full bg-[#5b45c8] text-sm text-white">
              <CheckIcon />
            </span>
            {value}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PricingDetails({ onChoose }: { onChoose: () => void }) {
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
    <div className="mt-10 space-y-9">
      <section>
        <h3 className="mb-4 text-2xl font-bold">What’s in your plan</h3>
        <ul className="space-y-3.5">
          {highlights.map(([icon, title, detail]) => (
            <li key={title} className="flex items-center gap-3.5">
              <IconArt name={icon} size={56} />
              <span>
                <b className="block text-[#231f33]">{title}</b>
                <small className="text-base text-[#5f5a72]">{detail}</small>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="mb-4 text-2xl font-bold">Inside the app</h3>
        <TemplateCarousel names={showcaseTemplates} />
      </section>
      <section>
        <h3 className="mb-4 text-2xl font-bold">What happens next</h3>
        <ol className="list-decimal space-y-2 pl-6">
          <li>Download AR Sketch & Trace</li>
          <li>Sign in with your email</li>
          <li>Open Day 1 and grab a pencil</li>
        </ol>
      </section>
      <section>
        <h3 className="mb-2 text-2xl font-bold">Questions</h3>
        {faq.map(([question, answer]) => (
          <details key={question} className="border-b border-[#d3ccdf] py-3">
            <summary className="cursor-pointer font-bold text-[#231f33]">{question}</summary>
            <p className="mt-2 text-base text-[#5f5a72]">{answer}</p>
          </details>
        ))}
      </section>
      <button type="button" onClick={onChoose} className="primary-button w-full">
        Choose my plan
      </button>
    </div>
  )
}
