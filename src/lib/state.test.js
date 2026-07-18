// Tests for the reactive app store (state.js) — focused on the streak recompute
// logic and the check-in/plan actions exposed by the public API.
//
// Notes on approach:
//  * `state` is a shared singleton, so we call resetAll() in beforeEach to isolate
//    each test (it clears profile/plan/checkins and re-runs recompute()).
//  * addCheckin() always keys the entry by today's date, so a single call can only
//    produce a one-day "streak". recompute() itself, however, just walks the
//    checkins in date order counting trailing 'resisted' entries — it never checks
//    that days are calendar-adjacent. So to exercise multi-day streak behaviour we
//    seed prior-day check-ins directly onto the reactive `state.checkins` array
//    (all dated in the past so they never collide with today's key), then trigger a
//    recompute through the public addCheckin() call for today. This keeps the tests
//    deterministic while still driving the real recompute() code path.
//  * These actions persist via saveState -> localStorage (db is null with no Firebase
//    config), which jsdom handles fine; we clear localStorage per test too.
import { describe, it, expect, beforeEach } from 'vitest'
import { state, addCheckin, setPlan, resetAll, hasPlan, todayEntry } from './state.js'
import { todayKey } from './store.js'

/** Seed historical (non-today) check-ins straight onto the reactive array. */
function seedPastCheckins(...statuses) {
  statuses.forEach((status, i) => {
    // Dates in 2020 — safely in the past, so they never equal todayKey().
    const day = `2020-01-${String(i + 1).padStart(2, '0')}`
    state.checkins.push({ day, status, mood: 3, note: '' })
  })
}

beforeEach(async () => {
  localStorage.clear()
  await resetAll()
})

describe('resetAll()', () => {
  it('clears profile, plan, checkins and zeroes all counters', async () => {
    await setPlan({ habit: 'vaping' }, { mantra: 'one breath' })
    await addCheckin({ status: 'resisted', mood: 4, note: 'ok' })

    await resetAll()

    expect(state.profile).toBeNull()
    expect(state.plan).toBeNull()
    expect(state.checkins).toEqual([])
    expect(state.streak).toBe(0)
    expect(state.best).toBe(0)
    expect(state.resisted).toBe(0)
    expect(state.relapsed).toBe(0)
    expect(hasPlan()).toBe(false)
  })
})

describe('hasPlan() / setPlan()', () => {
  it('is false with no profile or plan', () => {
    expect(hasPlan()).toBe(false)
  })

  it('becomes true only when both profile and plan are set', async () => {
    await setPlan({ habit: 'smoking', trigger: 'coffee' }, { title: 'Clear Air', mantra: 'not today' })
    expect(hasPlan()).toBe(true)
    expect(state.profile).toEqual({ habit: 'smoking', trigger: 'coffee' })
    expect(state.plan.title).toBe('Clear Air')
  })
})

describe('addCheckin() single-day behaviour', () => {
  it('records a resisted entry keyed by today and increments the streak', async () => {
    await addCheckin({ status: 'resisted', mood: 5, note: 'strong' })

    expect(state.checkins).toHaveLength(1)
    expect(state.streak).toBe(1)
    expect(state.best).toBe(1)
    expect(state.resisted).toBe(1)
    expect(state.relapsed).toBe(0)

    const entry = todayEntry()
    expect(entry).toBeTruthy()
    expect(entry.day).toBe(todayKey())
    expect(entry.status).toBe('resisted')
  })

  it('replaces (does not duplicate) when called twice on the same day', async () => {
    await addCheckin({ status: 'resisted', mood: 3, note: 'first' })
    await addCheckin({ status: 'relapsed', mood: 1, note: 'second' })

    // Still a single entry for today, updated in place.
    expect(state.checkins).toHaveLength(1)
    const entry = todayEntry()
    expect(entry.status).toBe('relapsed')
    expect(entry.note).toBe('second')
    expect(entry.mood).toBe(1)

    // Counters reflect the replacement, not both statuses.
    expect(state.resisted).toBe(0)
    expect(state.relapsed).toBe(1)
    expect(state.streak).toBe(0)
  })

  it('persists the check-in to localStorage', async () => {
    await addCheckin({ status: 'resisted', mood: 4, note: 'saved' })
    const raw = localStorage.getItem('unhook:v1:local')
    const saved = JSON.parse(raw)
    expect(saved.checkins).toHaveLength(1)
    expect(saved.checkins[0].status).toBe('resisted')
  })
})

describe('streak recompute over multiple days', () => {
  it('increments the streak for consecutive resisted days', async () => {
    seedPastCheckins('resisted', 'resisted')
    await addCheckin({ status: 'resisted', mood: 4, note: 'today' })

    expect(state.streak).toBe(3)
    expect(state.best).toBe(3)
    expect(state.resisted).toBe(3)
    expect(state.relapsed).toBe(0)
  })

  it('resets the current streak to 0 on a relapse but retains best', async () => {
    seedPastCheckins('resisted', 'resisted', 'resisted')
    await addCheckin({ status: 'relapsed', mood: 1, note: 'slip' })

    expect(state.streak).toBe(0) // current run broken
    expect(state.best).toBe(3) // best-ever preserved
    expect(state.resisted).toBe(3)
    expect(state.relapsed).toBe(1)
  })

  it('rebuilds a fresh streak after a relapse while best stays at the prior peak', async () => {
    // resisted x3 (peak 3) -> relapsed -> resisted (today, run of 1)
    seedPastCheckins('resisted', 'resisted', 'resisted', 'relapsed')
    await addCheckin({ status: 'resisted', mood: 3, note: 'back at it' })

    expect(state.streak).toBe(1)
    expect(state.best).toBe(3)
    expect(state.resisted).toBe(4)
    expect(state.relapsed).toBe(1)
  })

  it('tracks the maximum run as best across several relapses', async () => {
    // r, r (peak2), X, r, r, r (peak3), X, r(today, run1)
    seedPastCheckins('resisted', 'resisted', 'relapsed', 'resisted', 'resisted', 'resisted', 'relapsed')
    await addCheckin({ status: 'resisted', mood: 3, note: 'today' })

    expect(state.best).toBe(3)
    expect(state.streak).toBe(1)
    expect(state.resisted).toBe(6)
    expect(state.relapsed).toBe(2)
  })

  it('counts resisted and relapsed totals independent of ordering', async () => {
    seedPastCheckins('relapsed', 'resisted', 'relapsed', 'resisted')
    await addCheckin({ status: 'relapsed', mood: 2, note: 'today' })

    expect(state.resisted).toBe(2)
    expect(state.relapsed).toBe(3)
    expect(state.streak).toBe(0) // ends on a relapse
  })
})
