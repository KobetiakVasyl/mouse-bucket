import { describe, expect, it } from 'vitest'
import { parseRestoreDays } from '../../../../../src/renderer/src/validation/restore-validation'

describe('parseRestoreDays', () => {
  it('accepts whole days from 1 to 365', () => {
    expect(parseRestoreDays('1')).toBe(1)
    expect(parseRestoreDays(' 7 ')).toBe(7)
    expect(parseRestoreDays('365')).toBe(365)
  })

  it('refuses anything else', () => {
    for (const text of ['', '0', '366', '2.5', '-3', 'seven']) {
      expect(parseRestoreDays(text), text).toBeNull()
    }
  })
})
