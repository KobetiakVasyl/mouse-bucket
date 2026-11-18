import { describe, expect, it } from 'vitest'
import {
  accessOf,
  bucketRegionHeader,
  filesOf,
  foldersOf,
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
