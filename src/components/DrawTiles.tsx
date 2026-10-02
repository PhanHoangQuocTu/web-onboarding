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
      className="mt-7 grid grid-cols-2 gap-3"
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
          className="answer-card surface flex min-w-0 flex-col gap-4 rounded-[32px] p-4 text-left"
        >
          <span
            className="relative block aspect-square w-full overflow-hidden rounded-2xl bg-white shadow-[0_0_0_1px_var(--hair)]"
            aria-hidden="true"
          >
            <img
              src={`/art/draw/${option.value}.webp`}
              width={480}
              height={480}
              alt=""
              decoding="async"
              className="absolute inset-0 size-full object-cover"
            />
          </span>
          <span className="flex w-full items-end gap-2">
            <span className="min-h-[2.6em] min-w-0 flex-1 text-base font-semibold leading-[1.3] text-(--ink) [overflow-wrap:anywhere]">
              {option.label}
            </span>
            <span className="radio shrink-0 bg-white" aria-hidden="true">
              <CheckIcon />
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}
