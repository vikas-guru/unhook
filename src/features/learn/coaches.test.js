import { describe, expect, it } from 'vitest'
import { rankCoaches } from './coaches.js'

describe('rankCoaches()', () => {
  it('recommends the digital coach for screen and scrolling habits', () => {
    const result = rankCoaches('late-night doom scrolling on my phone')

    expect(result.recommendedId).toBe('digital')
    expect(result.ordered[0].id).toBe('digital')
  })

  it('recommends the nicotine coach for vaping habits', () => {
    const result = rankCoaches('stress vaping after meals')

    expect(result.recommendedId).toBe('nicotine')
    expect(result.ordered[0].id).toBe('nicotine')
  })

  it('falls back to the general coach when no specialty matches', () => {
    const result = rankCoaches('a hard-to-name evening loop')

    expect(result.recommendedId).toBe('anchor')
    expect(result.ordered[0].id).toBe('anchor')
  })
})
