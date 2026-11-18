// Readable names for S3's storage classes, the way the S3 console shows them, Azure's access tiers, and the classes and
// tiers an upload can use. See docs/UI.md.
import type { AccessTier, UploadStorageClass } from '../../../shared/types/storage-types'
import type { ChoiceOption } from '../types/component-types'

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

export const ACCESS_TIER_OPTIONS: ChoiceOption<AccessTier>[] = [
  { value: 'Archive', label: 'Archive' },
  { value: 'Cold', label: 'Cold' },
  { value: 'Cool', label: 'Cool' },
  { value: 'Hot', label: 'Hot' }
]

// What choosing each tier means for the files uploaded with it.
export const ACCESS_TIER_HINTS: Record<AccessTier, string> = {
  Archive:
    'The cheapest to store. Files must be rehydrated before they can be downloaded, which takes up to 15 hours, and are billed for at least 180 days.',
  Cold: 'Cheap to store for files you rarely need, which are billed for at least 90 days.',
  Cool: 'Cheaper to store than Hot for files you need now and then, which are billed for at least 30 days.',
  Hot: 'Files can be downloaded at once, but cost the most to store.'
}

export const UPLOAD_STORAGE_CLASS_OPTIONS: ChoiceOption<UploadStorageClass>[] = [
  { value: 'DEEP_ARCHIVE', label: 'Glacier Deep Archive' },
  { value: 'STANDARD', label: 'Standard' }
]

// What choosing each class means for the files uploaded with it.
export const UPLOAD_STORAGE_CLASS_HINTS: Record<UploadStorageClass, string> = {
  DEEP_ARCHIVE:
    'The cheapest to store. Files must be restored before they can be downloaded, which takes up to 48 hours, and are billed for at least 180 days.',
  STANDARD: 'Files can be downloaded at once, but cost more to store.'
}
