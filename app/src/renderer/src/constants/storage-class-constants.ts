// Readable names for S3's storage classes, the way the S3 console shows them. See docs/UI.md.
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
