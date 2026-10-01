'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useFlow } from '@/components/FlowProvider'
import { CheckIcon } from '@/components/CheckIcon'
import { useActivation } from '@/lib/activation'
import { isPaddleSandbox } from '@/lib/paddle'

const h3 = 'mb-3 text-2xl font-bold tracking-[-0.02em]'
const store =
  'brand-font flex h-14 items-center justify-center gap-3 rounded-full bg-(--ink) px-5 text-white'

const PLAN_LABEL = { trial: '3-Day Trial', weekly: 'Weekly', yearly: 'Yearly' } as const
const METHOD_LABEL: Record<string, string> = {
  card: 'Card',
  'apple-pay': 'Apple Pay',
  'google-pay': 'Google Pay',
  paypal: 'PayPal',
}

const BURST_COLORS = ['#5B45C8', '#7C69DB', '#A996E8', '#CFC3F2', '#EAE4FA', '#4A36AE']

const burstPieces = () =>
  Array.from({ length: 72 }, (_, n) => {
    const w = 6 + Math.random() * 6
    return {
      left: `${(Math.random() * 100).toFixed(1)}%`,
      width: w,
      height: n % 3 === 0 ? w : w * 1.7,
      borderRadius: n % 3 === 0 ? '50%' : 2,
      background: BURST_COLORS[n % BURST_COLORS.length],
      '--dx': `${Math.round((Math.random() - 0.5) * 220)}px`,
      '--r': `${Math.round(360 + Math.random() * 720)}deg`,
      animationDelay: `${(Math.random() * 0.7).toFixed(2)}s`,
      animationDuration: `${(2.4 + Math.random() * 1.3).toFixed(2)}s`,
    } as CSSProperties
  })

function ConfettiBurst() {
  const [pieces, setPieces] = useState<CSSProperties[] | null>(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // oxlint-disable-next-line react/set-state-in-effect
    setPieces(burstPieces())
    const timer = setTimeout(() => setPieces(null), 5000)
    return () => clearTimeout(timer)
  }, [])
  if (!pieces) return null
  return createPortal(
    <div
      className="burst pointer-events-none fixed inset-0 z-60 overflow-hidden"
      aria-hidden="true"
    >
      {pieces.map((style, n) => (
        <i key={n} style={style} />
      ))}
    </div>,
    document.body,
  )
}

export function CompleteScreen() {
  const { answers, receipt, sessionId, go, ready } = useFlow()
  const [copied, setCopied] = useState(false)
  const activation = useActivation(receipt?.transactionId, sessionId)
  if (!ready) return null
  if (!receipt?.transactionId)
    return (
      <div className="pt-3 text-center">
        <h2>Complete your checkout</h2>
        <p className="lede">We could not find a completed payment for this plan.</p>
        <button type="button" onClick={() => go('pricing')} className="primary-button mt-7 w-full">
          Back to checkout
        </button>
      </div>
    )
  const rows: [string, string][] = [
    ['Plan', PLAN_LABEL[receipt.plan]],
    ['Paid today', receipt.paidToday || 'See Paddle receipt'],
    ['Paid with', METHOD_LABEL[receipt.method] || receipt.method],
    ['Next charge', 'See Paddle receipt for amount and date'],
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
  const code = activation.state === 'ready' ? activation.code : null
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code ?? receipt.transactionId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* Clipboard may be unavailable; the reference stays visible to copy by hand. */
    }
  }
  return (
    <div className="flex flex-col gap-7">
      <ConfettiBurst />
      <div className="flex flex-col items-center gap-3 pt-3 text-center">
        <span className="pop mb-2 grid size-18 place-items-center rounded-full bg-(--accent) text-white shadow-[0_0_0_10px_rgba(91,69,200,0.14)] [--d:0.1s]">
          <svg width="36" height="36" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M5 12.5l4.5 4.5L19 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h2>You’re subscribed!</h2>
        <p className="lede mt-0!">
          {isPaddleSandbox
            ? 'Your Paddle sandbox checkout is complete. No live charge was made.'
            : 'Your payment is complete. Check your email for the Paddle receipt.'}
        </p>
      </div>
      <section className="rise rounded-[28px] bg-white p-5 shadow-[0_0_0_2px_var(--accent)] [--d:0.15s]">
        <p className="eyebrow mb-3">
          {code || activation.state === 'loading' ? 'Your activation code' : 'Payment reference'}
        </p>
        <div
          aria-label={code ? 'Activation code' : 'Paddle transaction ID'}
          aria-live="polite"
          className={`brand-font select-all rounded-2xl bg-(--surface-2) px-3 py-[18px] text-center font-bold text-(--ink) tabular-nums [overflow-wrap:anywhere] ${code ? 'text-2xl tracking-[0.08em]' : 'text-base'}`}
        >
          {code ??
            (activation.state === 'loading' ? 'Preparing your code…' : receipt.transactionId)}
        </div>
        <button
          type="button"
          onClick={copy}
          disabled={activation.state === 'loading'}
          className={`primary-button mt-3 flex w-full items-center justify-center gap-2 disabled:opacity-50 ${copied ? 'bg-(--accent)!' : ''}`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="9" y="9" width="11" height="11" rx="3" />
            <path d="M5 15V7a2 2 0 0 1 2-2h8" />
          </svg>
          {copied ? 'Copied' : code ? 'Copy code' : 'Copy reference'}
        </button>
        <p className="mt-4 text-lg leading-[1.45] font-semibold text-(--ink)">
          {code
            ? 'Open AR Sketch & Trace and enter this code to unlock Premium.'
            : activation.state === 'loading'
              ? 'Your code will appear here in a few seconds.'
              : 'Your code is still being prepared. Refresh this page in a minute, or contact support with this reference.'}
        </p>
        <p className="mt-3 flex gap-2.5 text-base leading-[1.45] text-(--muted)">
          <svg
            className="mt-0.5 shrink-0 text-(--accent)"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <path d="M4 8l8 6 8-6" />
          </svg>
          <span>Paddle sends the payment receipt to the email used at checkout.</span>
        </p>
      </section>
      <section>
        <h3 className={h3}>Get the app</h3>
        <div className="flex flex-col gap-2.5">
          <a
            className={store}
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
            <span className="flex flex-col items-start leading-[1.15]">
              <small className="font-[family-name:var(--text)] text-sm font-normal opacity-85">
                Download on the
              </small>
              <b className="text-xl font-semibold tracking-[-0.01em]">App Store</b>
            </span>
          </a>
          <a
            className={store}
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
            <span className="flex flex-col items-start leading-[1.15]">
              <small className="font-[family-name:var(--text)] text-sm font-normal opacity-85">
                Get it on
              </small>
              <b className="text-xl font-semibold tracking-[-0.01em]">Google Play</b>
            </span>
          </a>
        </div>
      </section>
      <section>
        <h3 className={h3}>Your receipt</h3>
        <dl className="surface rounded-[40px] px-6 py-5 text-base">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-(--hair) py-2">
              <dt className="text-(--muted)">{label}</dt>
              <dd className="text-right font-bold text-(--ink)">{value}</dd>
            </div>
          ))}
          {[
            [
              'Renewal',
              'Paddle charges your saved payment method according to the subscription terms.',
            ],
            ['Cancel', 'Anytime before the renewal date, from the link in your receipt email'],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-4 border-b border-(--hair) py-2 last:border-0"
            >
              <dt className="text-(--muted)">{label}</dt>
              <dd className="max-w-[212px] text-right text-(--body)">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="flex flex-col gap-3">
        <h3 className={`${h3} mb-0!`}>Before you draw</h3>
        {tips.map(([label, detail]) => (
          <p key={label} className="flex gap-2.5 text-lg leading-[1.45]">
            <span className="grid size-[22px] shrink-0 place-items-center rounded-full bg-(--accent) text-white">
              <CheckIcon />
            </span>
            <span>
              <b className="text-(--ink)">{label}:</b> {detail}
            </span>
          </p>
        ))}
      </section>
    </div>
  )
}
