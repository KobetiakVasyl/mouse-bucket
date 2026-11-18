import { describe, expect, it } from 'vitest'
import {
  accessOf,
  bucketRegionHeader,
  filesOf,
  foldersOf,
  partCount,
  partRange,
  partsBytes,
  partSizeFor
} from '../../../../src/main/utils/s3-utils'

const MiB = 1024 * 1024
const MODIFIED = new Date('2026-11-01T10:00:00Z')

describe('partSizeFor', () => {
  it('uses 8 MiB parts up to about 78 GiB', () => {
    expect(partSizeFor(0)).toBe(8 * MiB)
    expect(partSizeFor(78 * 1024 * MiB)).toBe(8 * MiB)
  })

  it('grows parts so no file needs more than 10,000', () => {
    const fiveTiB = 5 * 1024 * 1024 * MiB
    expect(Math.ceil(fiveTiB / partSizeFor(fiveTiB))).toBeLessThanOrEqual(10_000)
    expect(partSizeFor(fiveTiB) % MiB).toBe(0)
  })
})

describe('accessOf', () => {
  it('needs no restore outside the archive classes', () => {
    expect(accessOf('STANDARD', undefined)).toEqual({ state: 'available' })
    expect(accessOf('GLACIER_IR', undefined)).toEqual({ state: 'available' })
  })

  it('treats an archived file without a restore date as archived', () => {
    expect(accessOf('DEEP_ARCHIVE', { IsRestoreInProgress: false })).toEqual({
      state: 'archived'
    })
  })
})

describe('foldersOf and filesOf', () => {
  it('skips entries S3 sent without the fields they need', () => {
    expect(foldersOf([{ Prefix: 'a/' }, {}])).toEqual(['a/'])
    expect(foldersOf(undefined)).toEqual([])
    const files = filesOf([{ Key: 'x.txt', Size: 1, LastModified: MODIFIED }, { Key: 'y' }], '')
    expect(files.map((file) => file.key)).toEqual(['x.txt'])
    expect(filesOf(undefined, '')).toEqual([])
  })
})

describe('bucketRegionHeader', () => {
  it("reads the bucket's region from a failed request's headers", () => {
    const failed = { $response: { headers: { 'x-amz-bucket-region': 'eu-north-1' } } }
    expect(bucketRegionHeader(failed)).toBe('eu-north-1')
    expect(bucketRegionHeader(new Error('no response'))).toBe('')
  })
})

describe('parts', () => {
  it('splits a file into parts where only the last may be shorter', () => {
    expect(partCount(10, 4)).toBe(3)
    expect(partCount(8, 4)).toBe(2)
    expect(partCount(0, 4)).toBe(1)
    expect(partRange(1, 4, 10)).toEqual({ start: 0, length: 4 })
    expect(partRange(3, 4, 10)).toEqual({ start: 8, length: 2 })
    expect(partsBytes([1, 3], 4, 10)).toBe(6)
    expect(partsBytes([], 4, 10)).toBe(0)
  })
})
