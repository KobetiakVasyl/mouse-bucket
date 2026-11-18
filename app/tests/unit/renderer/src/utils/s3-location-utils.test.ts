import { describe, expect, it } from 'vitest'
import { formatS3Location } from '../../../../../src/renderer/src/utils/s3-location-utils'

describe('formatS3Location', () => {
  it('writes the s3:// form', () => {
    expect(formatS3Location({ bucket: 'b1', prefix: 'a/' })).toBe('s3://b1/a/')
    expect(formatS3Location({ bucket: 'b1', prefix: '' })).toBe('s3://b1/')
  })
})
