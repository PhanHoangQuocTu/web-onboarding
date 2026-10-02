import { describe, expect, it } from 'vitest'
import { POST } from '@/app/api/sessions/route'
import { isUuid } from '@/lib/server/billing'
import { db } from '@/lib/server/db'
import { jsonRequest, randomUUID } from './helpers'

const save = (body: unknown) => POST(jsonRequest('http://test/api/sessions', body))
const row = async (id: string) =>
  (await db.query('SELECT answers, email, plan, step FROM quiz_sessions WHERE id = $1', [id]))
    .rows[0]

describe('POST /api/sessions', () => {
  it('creates a session (control)', async () => {
    const id = randomUUID()
    const res = await save({
      id,
      answers: { who: 'me', frust: ['ads'] },
      email: 'a@example.com',
      plan: 'weekly',
      step: 'offer',
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(await row(id)).toEqual({
      answers: { who: 'me', frust: ['ads'] },
      email: 'a@example.com',
      plan: 'weekly',
      step: 'offer',
    })
  })

  it('replaces answers but keeps email and plan when omitted or empty', async () => {
    const id = randomUUID()
    await save({
      id,
      answers: { who: 'me' },
      email: 'a@example.com',
      plan: 'yearly',
      step: 'offer',
    })
    expect(
      (await save({ id, answers: { device: 'phone' }, email: '', step: 'pricing' })).status,
    ).toBe(200)
    expect(await row(id)).toEqual({
      answers: { device: 'phone' },
      email: 'a@example.com',
      plan: 'yearly',
      step: 'pricing',
    })
  })

  it('stores an empty email as null and trims emails', async () => {
    const a = randomUUID(),
      b = randomUUID()
    await save({ id: a, answers: {}, email: '' })
    await save({ id: b, answers: {}, email: '  b@example.com ' })
    expect((await row(a)).email).toBeNull()
    expect((await row(b)).email).toBe('b@example.com')
  })

  it('accepts every plan', async () => {
    for (const plan of ['trial', 'weekly', 'yearly'])
      expect((await save({ id: randomUUID(), answers: {}, plan })).status).toBe(200)
  })

  it('accepts answers up to 8 KB', async () => {
    const answers = { x: 'y'.repeat(8 * 1024 - 8) }
    expect(JSON.stringify(answers).length).toBe(8 * 1024)
    expect((await save({ id: randomUUID(), answers })).status).toBe(200)
  })

  it.each([
    ['non-JSON body', 'not json'],
    ['missing body', ''],
    ['bad id', { id: 'nope', answers: {} }],
    ['missing answers', { id: randomUUID() }],
    ['null answers', { id: randomUUID(), answers: null }],
    ['array answers', { id: randomUUID(), answers: [] }],
    ['string answers', { id: randomUUID(), answers: 'x' }],
    ['answers over 8 KB', { id: randomUUID(), answers: { x: 'y'.repeat(8 * 1024) } }],
    ['invalid email', { id: randomUUID(), answers: {}, email: 'not-an-email' }],
    ['non-string email', { id: randomUUID(), answers: {}, email: 42 }],
    ['unknown plan', { id: randomUUID(), answers: {}, plan: 'lifetime' }],
    ['step too long', { id: randomUUID(), answers: {}, step: 'x'.repeat(33) }],
    ['non-string step', { id: randomUUID(), answers: {}, step: 1 }],
  ])('rejects %s with 400', async (_, body) => {
    const res = await save(body)
    expect(res.status).toBe(400)
    const id = (body as { id?: string } | null)?.id
    if (typeof body === 'object' && isUuid(id)) expect(await row(id)).toBeUndefined()
  })

  it('does not wipe saved answers with null', async () => {
    const id = randomUUID()
    await save({ id, answers: { who: 'me' } })
    await save({ id, answers: null })
    expect((await row(id)).answers).toEqual({ who: 'me' })
  })
})

describe('POST /api/sessions: rate limit', () => {
  it('returns 429 after 30 requests a minute from one IP, other IPs unaffected', async () => {
    const send = (body: unknown, ip: string) =>
      POST(jsonRequest('http://test/api/sessions', body, { 'x-forwarded-for': ip }))
    for (let i = 0; i < 30; i++)
      expect((await send({ id: 'nope' }, '203.0.113.20')).status).toBe(400)
    const id = randomUUID()
    expect((await send({ id, answers: {} }, '203.0.113.20')).status).toBe(429)
    expect(await row(id)).toBeUndefined()
    expect((await send({ id, answers: {} }, '203.0.113.21')).status).toBe(200)
  })
})
