import { beforeEach, describe, expect, it, vi } from 'vitest'

const isArguments = (value: unknown) =>
  Object.prototype.toString.call(value) === '[object Arguments]'

async function load(gaId = 'G-TEST') {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_GA_ID', gaId)
  const win: { dataLayer?: unknown[]; gtag?: unknown } = {}
  vi.stubGlobal('window', win)
  return { win, ...(await import('@/lib/gtag')) }
}

const commands = (win: { dataLayer?: unknown[] }) =>
  (win.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>))

describe('trackEvent', () => {
  beforeEach(() => vi.resetModules())

  it('initializes gtag once, with user_id in config, before the first event', async () => {
    const { win, setGaUser, trackEvent } = await load()
    setGaUser('flow-1')
    trackEvent('screen_view', { screen_name: 'who' })
    trackEvent('cta_click', { button_text: 'Continue' })

    expect(win.dataLayer?.every(isArguments)).toBe(true)
    const sent = commands(win)
    expect(sent.map((c) => c[0])).toEqual(['js', 'config', 'event', 'event'])
    expect(sent[1]).toEqual(['config', 'G-TEST', { user_id: 'flow-1' }])
    expect(sent[2]).toEqual(['event', 'screen_view', { screen_name: 'who' }])
  })

  it('uses set for a user id that arrives after init', async () => {
    const { win, setGaUser, trackEvent } = await load()
    trackEvent('screen_view', { screen_name: 'who' })
    setGaUser('flow-2')
    setGaUser('flow-2')
    const sent = commands(win)
    expect(sent[1]).toEqual(['config', 'G-TEST', {}])
    expect(sent.filter((c) => c[0] === 'set')).toEqual([['set', { user_id: 'flow-2' }]])
  })

  it('does nothing without a GA id', async () => {
    const { win, trackEvent } = await load('')
    trackEvent('screen_view', { screen_name: 'who' })
    expect(win.dataLayer).toBeUndefined()
    expect(win.gtag).toBeUndefined()
  })

  it('control: a rest-param stub would push arrays, which gtag.js ignores', () => {
    const dataLayer: unknown[] = []
    const restStub = (...args: unknown[]) => dataLayer.push(args)
    restStub('event', 'screen_view')
    expect(dataLayer.every(isArguments)).toBe(false)
  })
})

describe('GA param helpers', () => {
  it('normalizes Paddle method names to ours', async () => {
    const { gaMethod } = await load()
    expect(gaMethod('apple-pay')).toBe('apple_pay')
    expect(gaMethod('google-pay')).toBe('google_pay')
    expect(gaMethod('apple_pay')).toBe('apple_pay')
    expect(gaMethod('card')).toBe('card')
  })

  it('sends purchase value net of tax, rounded to cents', async () => {
    const { purchaseParams } = await load()
    expect(purchaseParams('yearly', 'txn_1', 'EUR', { total: 10.89, tax: 0.9 })).toEqual({
      plan: 'yearly',
      transaction_id: 'txn_1',
      currency: 'EUR',
      value: 9.99,
      tax: 0.9,
      items: [{ item_id: 'yearly', item_name: 'Yearly', price: 9.99, quantity: 1 }],
    })
    expect(purchaseParams('trial', 'txn_2', 'USD', { total: 0.99, tax: 0 }).value).toBe(0.99)
  })

  it('marks only the yearly plan as discounted while the offer runs', async () => {
    const { isDiscounted } = await import('@/lib/pricing')
    expect(isDiscounted('yearly', true)).toBe(true)
    expect(isDiscounted('yearly', false)).toBe(false)
    expect(isDiscounted('weekly', true)).toBe(false)
    expect(isDiscounted('trial', true)).toBe(false)
  })
})
