import { describe, expect, it } from 'vitest'
import {
  accessOf,
  bucketRegionHeader,
  filesOf,
  foldersOf
} from '../../../../src/main/utils/s3-utils'

const MODIFIED = new Date('2026-11-01T10:00:00Z')

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
    expect(foldersOf([{ Prefix: 'a/b/' }, {}], 'a/')).toEqual([{ id: 'a/b/', name: 'b' }])
    expect(foldersOf(undefined, '')).toEqual([])
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
