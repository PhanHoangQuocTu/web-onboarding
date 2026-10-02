import { afterEach, describe, expect, it, vi } from 'vitest'
import { clientIp, consume } from '@/lib/server/rate-limit'

const withXff = (value?: string) =>
  new Request('http://test/', { headers: value ? { 'x-forwarded-for': value } : {} })

describe('clientIp', () => {
  it.each([
    ['198.51.100.1', '198.51.100.1'],
    ['1.2.3.4, 198.51.100.1', '198.51.100.1'],
    ['spoofed,  198.51.100.1 ', '198.51.100.1'],
    ['', 'unknown'],
    [undefined, 'unknown'],
  ])('reads %j as %s', (header, ip) => {
    expect(clientIp(withXff(header))).toBe(ip)
  })
})

describe('consume', () => {
  afterEach(() => vi.useRealTimers())

  it('allows the limit, blocks the next hit and resets after a minute', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    for (let i = 0; i < 3; i++) expect(consume('k', 3)).toBe(0)
    expect(consume('k', 3)).toBe(60)
    vi.advanceTimersByTime(45_000)
    expect(consume('k', 3)).toBe(15)
    expect(consume('other', 3)).toBe(0)
    vi.advanceTimersByTime(15_000)
    expect(consume('k', 3)).toBe(0)
  })

  it('stays bounded when keys flood in', () => {
    for (let i = 0; i < 49_999; i++) consume(`flood:${i}`, 1)
    expect(consume('flood:0', 1)).toBe(60)
    expect(consume('flood:49999', 1)).toBe(0)
    expect(consume('flood:1', 1)).toBe(0)
  })
})
