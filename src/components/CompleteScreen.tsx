'use client'

import { useState } from 'react'
import { useFlow } from '@/components/FlowProvider'
import { CheckIcon } from '@/components/CheckIcon'
import { nextCharge, price } from '@/lib/pricing'

// TODO: replace with the activation code returned by the backend after a successful payment
const PLACEHOLDER_CODE = 'BCF4-H49E-DXT5'
const PLAN_LABEL = { trial: '3-Day Trial', weekly: 'Weekly', yearly: 'Yearly' } as const

export function CompleteScreen() {
  const { answers, email, plan, receipt, ready } = useFlow()
  const [copied, setCopied] = useState(false)
  if (!ready) return null
  const code = PLACEHOLDER_CODE
  const shown = receipt ?? {
    plan,
    today: price(plan).today,
    next: nextCharge(plan),
    method: 'Card',
  }
  const rows: [string, string][] = [
    ['Plan', PLAN_LABEL[shown.plan]],
    ['Paid today', shown.today],
    ['Paid with', shown.method],
    ['Next charge', shown.next],
  ]
  const tips = [
    [
      'Setup',
      answers.device === 'tablet'
        ? 'Lay a thin sheet of paper on the screen and turn the brightness up.'
        : 'Prop your phone on a stand, a tall glass or a stack of books, camera facing down, about 30 cm above the paper.',
    ],
    [
      'Practice',
      {
        full: 'Start with step-by-step tracing, one step at a time.',
        outline: 'Trace the outline first, then add the details freehand.',
        reference: 'Keep the image in view and use it as a guide while you draw.',
      }[String(answers.style)] || 'Start with step-by-step tracing.',
    ],
    [
      'Reminders',
      {
        daily: 'Turn on daily practice reminders in the app.',
        three: 'Turn on reminders 3 times a week in the app.',
      }[String(answers.remind)] || 'Draw whenever suits you.',
    ],
  ]
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* Clipboard may be unavailable; the code stays visible to copy by hand. */
    }
  }
  return (
    <div className="mx-auto flex w-full max-w-[342px] flex-col">
      <div className="flex flex-col items-center text-center">
        <svg width="92" height="92" viewBox="0 0 92 92" fill="none" aria-hidden="true">
          <rect x="10" y="10" width="72" height="72" rx="36" fill="#5b45c8" />
          <rect
            x="5"
            y="5"
            width="82"
            height="82"
            rx="41"
            stroke="#5b45c8"
            strokeOpacity=".14"
            strokeWidth="10"
          />
          <path
            d="m35.5 46.75 6.75 6.75 14.25-15"
            stroke="#fff"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h2 className="mt-4">You’re subscribed!</h2>
        <p className="mt-2 max-w-62 text-base text-[#5f5a72]">
          Welcome to Premium. Use your code to unlock it in the app.
        </p>
      </div>
      <section className="mt-7 rounded-[28px] border-2 border-[#5b45c8] bg-white p-5">
        <p className="brand-font text-sm font-semibold uppercase tracking-wider text-[#5b45c8]">
          Your activation code
        </p>
        <div
          aria-label="Activation code"
          className="brand-font mt-3 rounded-2xl bg-[#ece8f2] py-4 text-center text-xl font-bold tracking-[0.12em] text-[#231f33]"
        >
          {code}
        </div>
        <button
          type="button"
          onClick={copy}
          className="brand-font mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#2d2550] text-lg font-semibold text-white"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M12.75 6.75H9A2.25 2.25 0 0 0 6.75 9v3.75A2.25 2.25 0 0 0 9 15h3.75A2.25 2.25 0 0 0 15 12.75V9a2.25 2.25 0 0 0-2.25-2.25"
              stroke="#fff"
              strokeWidth="1.65"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3.75 11.25v-6a1.5 1.5 0 0 1 1.5-1.5h6"
              stroke="#fff"
              strokeWidth="1.65"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {copied ? 'Copied!' : 'Copy code'}
        </button>
        <p className="mt-4 text-lg max-w-[266px] font-semibold text-[#231f33]">
          Here’s the code to activate your membership. Open AR Sketch &amp; Trace and enter it to
          unlock Premium.
        </p>
        <p className="mt-3 flex gap-2.5 text-sm text-[#5f5a72]">
          <svg
            className="shrink-0"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M15 4.167H5a2.5 2.5 0 0 0-2.5 2.5v6.666a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5V6.667a2.5 2.5 0 0 0-2.5-2.5"
              stroke="#5b45c8"
              strokeWidth="1.667"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="m3.333 6.667 6.667 5 6.666-5"
              stroke="#5b45c8"
              strokeWidth="1.667"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[#5F5A72]">
            We’ve also sent a code to <b className="text-[#231f33]">{email || 'your email'}</b>, so
            you can activate your premium in the app from there too.
          </span>
        </p>
      </section>
      <h3 className="mt-7 text-2xl font-bold">Get the app</h3>
      <div className="mt-3 flex flex-col gap-2.5">
        <a
          className="brand-font flex min-h-[52px] items-center justify-center gap-3 rounded-full bg-[#231f33] text-left font-semibold text-white"
          href="https://apps.apple.com/us/app/ar-sketch-trace/id6754591942"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path
              d="M11.14 6.321c-.87 0-2.214-.988-3.63-.953-1.87.025-3.584 1.084-4.548 2.763-1.94 3.369-.5 8.344 1.393 11.082.928 1.333 2.024 2.833 3.476 2.786 1.393-.06 1.915-.905 3.607-.905 1.678 0 2.154.905 3.63.87 1.5-.024 2.453-1.357 3.37-2.703a12 12 0 0 0 1.523-3.13c-.036-.012-2.917-1.12-2.952-4.453-.024-2.786 2.274-4.12 2.38-4.179-1.31-1.916-3.32-2.13-4.023-2.178-1.834-.143-3.37 1-4.226 1m3.096-2.81C15.01 2.583 15.52 1.286 15.378 0c-1.107.048-2.44.738-3.238 1.667-.715.82-1.333 2.143-1.167 3.404 1.226.095 2.489-.63 3.262-1.56"
              fill="#fff"
            />
          </svg>
          <span className="leading-tight">
            <small className="block text-sm font-normal">Download on the</small>
            <span className="text-xl font-semibold">App Store</span>
          </span>
        </a>
        <a
          className="brand-font flex min-h-[52px] items-center justify-center gap-3 rounded-full bg-[#231f33] text-left font-semibold text-white"
          href="https://play.google.com/store/apps/details?id=com.ar.trace.sketch.draw"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="m22.018 13.298-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594"
              fill="#ffd500"
            />
            <path
              d="M1.337.924c-.075.18-.113.373-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087z"
              fill="#00a0ff"
            />
            <path
              d="m13.544 10.989 3.258-3.238L3.45.195a1.47 1.47 0 0 0-.946-.179z"
              fill="#00e36b"
            />
            <path
              d="m13.544 13.056-11 10.933c.298.036.612-.016.906-.183l13.324-7.54z"
              fill="#ff3b30"
            />
          </svg>
          <span className="leading-tight">
            <small className="block text-sm font-normal">Get it on</small>
            <span className="text-xl font-semibold">Google Play</span>
          </span>
        </a>
      </div>
      <h3 className="mt-7 text-2xl font-bold">Your receipt</h3>
      <dl className="surface mt-3 rounded-3xl px-4 py-2 text-sm">
        {rows.map(([label, value], i) => (
          <div
            key={label}
            className={`flex justify-between gap-4 py-3 ${i ? 'border-t border-[#ece8f2]' : ''}`}
          >
            <dt className="text-[#5f5a72]">{label}</dt>
            <dd className="text-right font-bold text-[#231f33]">{value}</dd>
          </div>
        ))}
        {[
          [
            'Renewal',
            `We charge ${shown.method} automatically and email you a new access code on that date.`,
          ],
          ['Cancel', 'Anytime before the renewal date, from the link in your receipt email'],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 border-t border-[#ece8f2] py-3">
            <dt className="text-[#5f5a72]">{label}</dt>
            <dd className="max-w-[212px] text-right text-[#5f5a72]">{value}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-7 text-2xl font-bold">Before you draw</h3>
      <div className="mt-3 space-y-3">
        {tips.map(([label, detail]) => (
          <p key={label} className="flex gap-2.5">
            <span className="grid size-[22px] shrink-0 place-items-center rounded-full bg-[#5b45c8] text-white">
              <CheckIcon />
            </span>
            <span>
              <b className="text-[#231f33] text-lg font-bold">{label}:</b> {detail}
            </span>
          </p>
        ))}
      </div>
    </div>
  )
}
