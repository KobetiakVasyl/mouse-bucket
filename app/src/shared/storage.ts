// What every upload sends to S3, and readable names for S3's storage classes. See docs/ARCHITECTURE.md.
export const UPLOAD_STORAGE_CLASS = 'DEEP_ARCHIVE'
export const UPLOAD_CHECKSUM = 'CRC64NVME'

const STORAGE_CLASS_LABELS = new Map([
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

export function storageClassLabel(storageClass: string): string {
  const label = STORAGE_CLASS_LABELS.get(storageClass)
  return label === undefined ? storageClass : label
}
