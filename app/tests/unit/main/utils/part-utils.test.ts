import { describe, expect, it } from 'vitest'
import {
  partCount,
  partNumbers,
  partRange,
  partsBytes,
  partSizeFor
} from '../../../../src/main/utils/part-utils'

const MiB = 1024 * 1024

describe('partSizeFor', () => {
  it('uses 8 MiB parts up to about 78 GiB', () => {
    expect(partSizeFor(0)).toBe(8 * MiB)
    expect(partSizeFor(78 * 1024 * MiB)).toBe(8 * MiB)
  })

  it('grows parts so no file needs more than 10,000, in whole MiB as Google Drive needs', () => {
    const fiveTiB = 5 * 1024 * 1024 * MiB
    expect(Math.ceil(fiveTiB / partSizeFor(fiveTiB))).toBeLessThanOrEqual(10_000)
    expect(partSizeFor(fiveTiB) % MiB).toBe(0)
  })
})

describe('parts', () => {
  it('splits a file into parts where only the last may be shorter', () => {
    expect(partCount(10, 4)).toBe(3)
    expect(partCount(8, 4)).toBe(2)
    expect(partCount(0, 4)).toBe(1)
    expect(partNumbers(10, 4)).toEqual([1, 2, 3])
    expect(partRange(1, 4, 10)).toEqual({ start: 0, length: 4 })
    expect(partRange(3, 4, 10)).toEqual({ start: 8, length: 2 })
    expect(partsBytes([1, 3], 4, 10)).toBe(6)
    expect(partsBytes([], 4, 10)).toBe(0)
  })
})
