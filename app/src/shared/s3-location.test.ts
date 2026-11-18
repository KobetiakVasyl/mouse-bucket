import { describe, expect, it } from 'vitest'
import { formatS3Location, parseS3Location } from './s3-location'

describe('parseS3Location', () => {
  it('reads a bucket and folder, with or without s3://', () => {
    for (const input of ['s3://my-bucket/a/b/', 'my-bucket/a/b', '  S3://my-bucket//a/b  ']) {
      expect(parseS3Location(input), input).toEqual({
        location: { bucket: 'my-bucket', prefix: 'a/b/' }
      })
    }
  })

  it('reads a whole bucket', () => {
    for (const input of ['s3://my.bucket', 'my.bucket/', 's3://my.bucket/']) {
      expect(parseS3Location(input), input).toEqual({
        location: { bucket: 'my.bucket', prefix: '' }
      })
    }
  })

  it('rejects invalid bucket names', () => {
    for (const input of ['', 's3://', 'My-Bucket', 'ab', '-bucket', 'a..b', '192.168.1.1', 'a_b']) {
      expect(parseS3Location(input), input).toHaveProperty('error')
    }
  })
})

describe('formatS3Location', () => {
  it('writes the s3:// form', () => {
    expect(formatS3Location({ bucket: 'b1', prefix: 'a/' })).toBe('s3://b1/a/')
    expect(formatS3Location({ bucket: 'b1', prefix: '' })).toBe('s3://b1/')
  })
})
