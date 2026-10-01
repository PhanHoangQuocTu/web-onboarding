import { describe, expect, it } from 'vitest'
import { entitlement, formatCode, generateCode, isUuid, normalizeCode } from '@/lib/server/billing'

const hours = (n: number) => new Date(Date.now() + n * 3600e3)

describe('activation code helpers', () => {
  it('generates 12 unambiguous characters', () => {
    const codes = Array.from({ length: 2000 }, generateCode)
    for (const code of codes) expect(code).toMatch(/^[A-HJ-NP-Z2-9]{12}$/)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('uses every symbol of the alphabet', () => {
    const seen = new Set(Array.from({ length: 500 }, generateCode).join(''))
    expect(seen.size).toBe(32)
    for (const char of 'IO01') expect(seen.has(char)).toBe(false)
  })

  it('formats and normalizes codes', () => {
    expect(formatCode('ABCDEFGHJKLM')).toBe('ABCD-EFGH-JKLM')
    expect(formatCode('')).toBe('')
    expect(normalizeCode(' abcd-efgh jklm ')).toBe('ABCDEFGHJKLM')
    expect(normalizeCode(formatCode('ABCDEFGHJKLM'))).toBe('ABCDEFGHJKLM')
  })

  it('validates UUIDs', () => {
    expect(isUuid('0b6f2b4e-6c5a-4f0e-9a43-2a7d6b9d1c3e')).toBe(true)
    expect(isUuid('0B6F2B4E-6C5A-4F0E-9A43-2A7D6B9D1C3E')).toBe(true)
    for (const value of ['', 'nope', 123, null, undefined, '0b6f2b4e6c5a4f0e9a432a7d6b9d1c3e'])
      expect(isUuid(value)).toBe(false)
  })
})

describe('entitlement', () => {
  it.each([
    ['active', true],
    ['trialing', true],
    ['past_due', false],
    ['paused', false],
    ['canceled', false],
  ])('%s with a future period -> premium %s', (status, premium) => {
    expect(entitlement(status, hours(24), null).premium).toBe(premium)
  })

  it('keeps premium for 24 hours after the period ends', () => {
    expect(entitlement('active', hours(-23), null).premium).toBe(true)
    expect(entitlement('active', hours(-25), null).premium).toBe(false)
  })

  it('treats a missing period end as open-ended', () => {
    expect(entitlement('active', null, null)).toEqual({
      premium: true,
      status: 'active',
      plan: null,
      expiresAt: null,
    })
  })

  it('maps configured price IDs to plans', () => {
    const end = hours(24)
    expect(entitlement('active', end, 'pri_trial').plan).toBe('trial')
    expect(entitlement('active', end, 'pri_weekly').plan).toBe('weekly')
    expect(entitlement('active', end, 'pri_yearly').plan).toBe('yearly')
    expect(entitlement('active', end, 'pri_unknown').plan).toBeNull()
    expect(entitlement('active', end, 'pri_weekly').expiresAt).toBe(end.toISOString())
  })
})
