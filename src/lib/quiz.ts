export type AnswerValue = string | string[]
export type Answers = Record<string, AnswerValue>
export type Option = { value: string; label: string; icon: string }
export type Question = {
  id: string
  title: string | ((answers: Answers) => string)
  lede?: string
  options: Option[]
  kind?: 'tiles' | 'multi'
  none?: string
}

const option = (value: string, label: string, icon: string): Option => ({ value, label, icon })
const child = (a: Answers) => a.who === 'child'

export const questions: Question[] = [
  {
    id: 'who',
    title: 'Who’s going to draw?',
    lede: '14 quick taps to your own 7-day plan.',
    options: [
      option('me', 'Just me', 'me'),
      option('child', 'My child', 'child'),
      option('both', 'Both of us', 'both'),
    ],
  },
  {
    id: 'goal',
    title: (a) => (child(a) ? 'Why draw with your child?' : 'What brings you to drawing?'),
    options: [
      option('gift', 'Make a personal gift (Portraits, family, pets)', 'gift'),
      option('relax', 'Unwind after a long day', 'relax'),
      option('kids', 'Creative time instead of screen time', 'kids'),
      option('hobby', 'Start a new daily hobby', 'hobby'),
    ],
  },
  {
    id: 'draw',
    kind: 'tiles',
    title: (a) => (child(a) ? 'What does your child love to draw?' : 'What do you love to draw?'),
    options: [
      option('people', 'Portraits & People', 'halfbodygirl'),
      option('characters', 'Anime & Cartoons', 'catgirl'),
      option('animals', 'Animals & Pets', 'cat'),
      option('nature', 'Flowers & Cute Things', 'daisy'),
    ],
  },
  {
    id: 'level',
    title: (a) =>
      child(a) ? 'Where is your child starting from?' : 'Where are you starting from?',
    options: [
      option('beginner', 'Stick figures (Beginner)', 'beginner'),
      option('amateur', 'Simple shapes (Amateur)', 'amateur'),
      option('intermediate', 'Pretty good, want faster (Intermediate)', 'intermediate'),
    ],
  },
  {
    id: 'block',
    title: 'What’s held you back so far?',
    options: [
      option('talent', 'I’m not talented enough', 'talent'),
      option('time', 'No time to practice', 'time'),
      option('start', 'I don’t know where to start', 'start'),
    ],
  },
  {
    id: 'device',
    title: 'What will you draw with?',
    options: [
      option('phone', 'My phone', 'phone'),
      option('tablet', 'An iPad or tablet', 'tablet'),
    ],
  },
  {
    id: 'skillup',
    title: 'What do you want to get better at?',
    options: [
      option('proportion', 'Getting proportions right', 'proportion'),
      option('lines', 'Smooth, confident lines', 'lines'),
      option('shading', 'Shading and details', 'shading'),
    ],
  },
  {
    id: 'style',
    title: 'How much help do you want?',
    options: [
      option('full', 'Trace it all, step by step (Easiest)', 'full'),
      option('outline', 'Trace the outline, then freehand', 'outline'),
      option('reference', 'Just look and draw', 'reference'),
    ],
  },
  {
    id: 'motive',
    title: 'What keeps you coming back?',
    options: [
      option('results', 'Quick wins every day', 'results'),
      option('big', 'One big masterpiece', 'big'),
      option('streaks', 'Reminders and streaks', 'streaks'),
    ],
  },
  {
    id: 'photos',
    title: 'Want to trace your own photos?',
    lede: 'Selfies, pets, the people you love.',
    options: [
      option('mostly', 'Yes, mostly mine', 'mostly'),
      option('mix', 'A mix (Photos and templates)', 'mix'),
      option('library', 'Just the app’s templates', 'library'),
    ],
  },
  {
    id: 'time',
    title: 'How long can you draw each day?',
    options: [
      option('short', '5–10 min (Quick and easy)', 'short'),
      option('mid', '15–30 min (Focused)', 'mid'),
      option('long', '30+ min (Deep dive)', 'long'),
    ],
  },
  {
    id: 'aim',
    title: 'Where do you want to be in 30 days?',
    options: [
      option('notrace', 'Drawing without tracing', 'notrace'),
      option('masterpiece', 'One finished masterpiece', 'masterpiece'),
      option('daily', 'Drawing daily to relax', 'daily'),
    ],
  },
  {
    id: 'remind',
    title: 'Want a nudge to keep going?',
    options: [
      option('daily', 'Every day', 'remind'),
      option('three', '3 times a week', 'three'),
      option('no', 'No thanks', 'noremind'),
    ],
  },
  {
    id: 'frust',
    kind: 'multi',
    title: 'What bugged you in other apps?',
    lede: 'Pick all that apply.',
    none: 'never',
    options: [
      option('ads', 'Too many ads', 'ads'),
      option('hidden', 'Hidden weekly charges', 'hidden'),
      option('photofee', 'Paying extra for my own photos', 'photofee'),
      option('never', 'I haven’t tried any', 'never'),
    ],
  },
]

export const flow = [
  'who',
  'goal',
  'draw',
  'level',
  'block',
  'break1',
  'device',
  'skillup',
  'style',
  'motive',
  'photos',
  'break2',
  'time',
  'aim',
  'remind',
  'frust',
  'loading',
] as const
// 1-based position of a screen in the whole funnel, for GA step ordering.
const funnel: string[] = [...flow, 'plan', 'email', 'offer', 'pricing', 'complete']
export const stepIndex = (id: string) => funnel.indexOf(id) + 1
export const questionNumber = (id: string) => questions.findIndex((q) => q.id === id) + 1
export const nextStep = (id: string) => {
  const index = flow.indexOf(id as (typeof flow)[number])
  return index < 0 ? 'who' : index === flow.length - 1 ? 'plan' : flow[index + 1]
}
export const previousStep = (id: string) => {
  if (id === 'plan') return 'frust'
  if (id === 'email') return 'plan'
  if (id === 'offer') return 'email'
  if (id === 'pricing') return 'offer'
  const index = flow.indexOf(id as (typeof flow)[number])
  for (let i = index - 1; i >= 0; i--)
    if (!['break1', 'break2', 'loading'].includes(flow[i])) return flow[i]
  return 'who'
}
export const titleFor = (question: Question, answers: Answers) =>
  typeof question.title === 'function' ? question.title(answers) : question.title
