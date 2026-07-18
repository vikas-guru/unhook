// Tests for the persistence layer (store.js). In the test environment no Firebase
// project is configured (VITE_FIREBASE_PROJECT_ID is undefined), so `db` is null and
// every read/write flows through the localStorage fallback path — which is exactly
// what we exercise here. jsdom provides a real localStorage; we clear it per test.
import { describe, it, expect, beforeEach } from 'vitest'
import { todayKey, loadState, saveState } from './store.js'

beforeEach(() => {
  localStorage.clear()
})

describe('todayKey()', () => {
  it('formats a date as zero-padded YYYY-MM-DD', () => {
    // Month is 0-indexed in Date, so 0 -> "01". Single-digit day -> "05".
    expect(todayKey(new Date(2025, 0, 5))).toBe('2025-01-05')
  })

  it('does not truncate two-digit months and days', () => {
    expect(todayKey(new Date(2025, 11, 31))).toBe('2025-12-31')
  })

  it('defaults to today and matches the YYYY-MM-DD shape', () => {
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('saveState() / loadState() round-trip via localStorage', () => {
  it('returns null when nothing has been saved yet', async () => {
    expect(await loadState(null)).toBeNull()
  })

  it('persists a blob and loads it back with all fields intact', async () => {
    const blob = { profile: { habit: 'doom-scrolling' }, checkins: [{ day: '2025-01-01', status: 'resisted' }] }
    await saveState(null, blob)

    const loaded = await loadState(null)
    expect(loaded.profile).toEqual({ habit: 'doom-scrolling' })
    expect(loaded.checkins).toEqual([{ day: '2025-01-01', status: 'resisted' }])
  })

  it('actually writes JSON into localStorage under the local key', async () => {
    await saveState(null, { a: 1 })
    const raw = localStorage.getItem('unhook:v1:local')
    expect(raw).toBeTypeOf('string')
    expect(JSON.parse(raw)).toMatchObject({ a: 1 })
  })

  it('keys separate uids independently', async () => {
    await saveState('alice', { who: 'alice' })
    await saveState('bob', { who: 'bob' })
    expect((await loadState('alice')).who).toBe('alice')
    expect((await loadState('bob')).who).toBe('bob')
  })
})

describe('saveState() stamps updatedAt', () => {
  it('adds an ISO updatedAt timestamp to the returned payload', async () => {
    const payload = await saveState(null, { foo: 'bar' })
    expect(payload.foo).toBe('bar')
    expect(payload.updatedAt).toBeTypeOf('string')
    // Round-trips through Date without becoming Invalid Date.
    expect(Number.isNaN(Date.parse(payload.updatedAt))).toBe(false)
    expect(payload.updatedAt).toBe(new Date(payload.updatedAt).toISOString())
  })

  it('persists updatedAt so a subsequent load sees it', async () => {
    await saveState(null, { foo: 'bar' })
    const loaded = await loadState(null)
    expect(loaded.updatedAt).toBeTypeOf('string')
  })

  it('refreshes updatedAt on each save', async () => {
    const first = await saveState(null, { n: 1 })
    await new Promise((r) => setTimeout(r, 5))
    const second = await saveState(null, { n: 2 })
    expect(Date.parse(second.updatedAt)).toBeGreaterThanOrEqual(Date.parse(first.updatedAt))
  })
})
