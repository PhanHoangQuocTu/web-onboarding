'use client'

import { useFlow } from './FlowProvider'
import { TemplateArt } from './Art'
import { StickyAction } from './Ui'

export function BreakScreen({ part }: { part: 1 | 2 }) {
  const { go, ready } = useFlow()
  if (!ready) return null
  if (part === 1) {
    return (
      <>
        <div
          role="img"
          aria-label="Cool-eyed girl drawing preview"
          className="grid aspect-4/3 w-full place-items-center overflow-hidden rounded-3xl border border-[#6d53e9] bg-white"
        >
          <TemplateArt name="coldgirl" className="w-[80%] bg-transparent!" />
        </div>
        <h2 className="mt-5 max-w-85 text-2xl leading-tight">
          A lot of people feel that way at first.
        </h2>
        <p className="mt-3 max-w-85 text-base leading-[1.45] text-[#5f5a72]">
          Follow the lines one step at a time. By the last step, you’ve drawn this cool-eyed girl
          yourself.
        </p>
        <StickyAction onClick={() => go('device')}>Keep going</StickyAction>
      </>
    )
  }
  return (
    <>
      <div className="rounded-[20px] border border-[#6d53e9] bg-white px-3 py-5">
        <ol
          className="grid grid-cols-7 place-items-center gap-1"
          aria-label="Seven-day drawing plan"
        >
          {Array.from({ length: 7 }, (_, index) => (
            <li
              key={index}
              aria-label={`Day ${index + 1}${index === 0 ? ', ready' : ''}`}
              className={`grid size-[clamp(28px,8vw,36px)] place-items-center rounded-full border border-[#5b45c8] text-xs font-semibold ${index === 0 ? 'bg-[#5b45c8] text-white' : 'text-[#4a36ae]'}`}
            >
              {index + 1}
            </li>
          ))}
        </ol>
        <div className="mt-2.5 flex justify-between text-[10px] font-semibold tracking-wider text-[#5f5a72]">
          <span>DAY 1</span>
          <span>DAY 7</span>
        </div>
      </div>
      <h2 className="mt-4 text-xl leading-tight">One small win a day.</h2>
      <p className="mt-2 text-sm leading-snug text-[#5f5a72]">
        Seven days, one drawing each day. Day 1 is ready when you are.
      </p>
      <StickyAction onClick={() => go('time')}>Almost there</StickyAction>
    </>
  )
}
