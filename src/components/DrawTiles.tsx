import { CheckIcon } from './CheckIcon'
import type { Option } from '@/lib/quiz'

export function DrawTiles({
  options,
  selected,
  onChoose,
  title,
}: {
  options: Option[]
  selected: string | null
  onChoose: (value: string) => void
  title: string
}) {
  return (
    <div
      className="mt-7 grid grid-cols-2 gap-2.5"
      role="radiogroup"
      aria-label={title.replaceAll('|', ' ')}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={selected === option.value}
          onClick={() => onChoose(option.value)}
          className="answer-card surface flex min-w-0 flex-col rounded-[28px] p-[14px] text-left"
        >
          <span
            className="relative block aspect-square w-full overflow-hidden rounded-[16px] border border-[#e9e6ed] bg-white"
            aria-hidden="true"
          >
            <span
              className="absolute inset-[3%] bg-[#302c3d] mask-center mask-no-repeat mask-contain"
              style={{ maskImage: `url(/art/t/${option.icon}.png)` }}
            />
          </span>
          <span className="mt-3 flex min-h-9 w-full items-end justify-between gap-1">
            <span className="brand-font min-w-0 text-[14px] font-semibold leading-tight text-[#231f33]">
              {option.label}
            </span>
            <span className="radio !size-5 shrink-0" aria-hidden="true">
              <CheckIcon />
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}
