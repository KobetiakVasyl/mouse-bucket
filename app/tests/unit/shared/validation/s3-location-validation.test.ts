import { describe, expect, it } from 'vitest'
import { parseS3Location } from '../../../../src/shared/validation/s3-location-validation'

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
