import { describe, expect, it } from 'vitest'
import { UPLOAD_STORAGE_CLASS } from '../../../../../src/shared/constants/storage-constants'
import { storageClassLabel } from '../../../../../src/renderer/src/utils/storage-utils'

describe('storageClassLabel', () => {
  it('names the storage classes the way the S3 console does', () => {
    expect(storageClassLabel(UPLOAD_STORAGE_CLASS)).toBe('Glacier Deep Archive')
    expect(storageClassLabel('STANDARD')).toBe('Standard')
    expect(storageClassLabel('GLACIER')).toBe('Glacier Flexible Retrieval')
  })

  it("shows S3's own name for a class it doesn't know", () => {
    expect(storageClassLabel('FUTURE_CLASS')).toBe('FUTURE_CLASS')
  })
})
