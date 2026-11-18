// Readable names for S3's storage classes, the way the S3 console shows them, and the classes an upload can use. See docs/UI.md.
import type { UploadStorageClass } from '../../../shared/types/s3-types'
import type { ToggleOption } from '../types/component-types'

export const STORAGE_CLASS_LABELS: ReadonlyMap<string, string> = new Map([
  ['STANDARD', 'Standard'],
  ['STANDARD_IA', 'Standard-IA'],
  ['ONEZONE_IA', 'One Zone-IA'],
  ['INTELLIGENT_TIERING', 'Intelligent-Tiering'],
  ['GLACIER_IR', 'Glacier Instant Retrieval'],
  ['GLACIER', 'Glacier Flexible Retrieval'],
  ['DEEP_ARCHIVE', 'Glacier Deep Archive'],
  ['REDUCED_REDUNDANCY', 'Reduced Redundancy'],
  ['EXPRESS_ONEZONE', 'Express One Zone'],
  ['OUTPOSTS', 'Outposts'],
  ['SNOW', 'Snow']
])

export const UPLOAD_STORAGE_CLASS_OPTIONS: ToggleOption<UploadStorageClass>[] = [
  { value: 'DEEP_ARCHIVE', label: 'Glacier Deep Archive' },
  { value: 'STANDARD', label: 'Standard' }
]

// What choosing each class means for the files uploaded with it.
export const UPLOAD_STORAGE_CLASS_HINTS: Record<UploadStorageClass, string> = {
  DEEP_ARCHIVE:
    'The cheapest to store. Files must be restored before they can be downloaded, which takes up to 48 hours, and are billed for at least 180 days.',
  STANDARD: 'Files can be downloaded at once, but cost more to store.'
}
