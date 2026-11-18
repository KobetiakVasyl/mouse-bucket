// Fixed values for talking to S3: the first region to ask, and how uploads are split into parts. See docs/ARCHITECTURE.md.

// Any region works for the first request: S3 answers with the bucket's real region.
export const DISCOVERY_REGION = 'us-east-1'

const MiB = 1024 * 1024

export const PART_SIZE_STEP = MiB
export const MIN_PART_SIZE = 8 * MiB
// S3's limit on the parts of one upload.
export const MAX_PARTS = 10_000
// How many parts of one file are sent at once.
export const UPLOAD_QUEUE_SIZE = 4

// Files in these classes must be restored before they can be downloaded.
export const ARCHIVE_STORAGE_CLASSES: ReadonlySet<string> = new Set(['GLACIER', 'DEEP_ARCHIVE'])

// The storage class S3 reports for an object it lists without one.
export const DEFAULT_STORAGE_CLASS = 'STANDARD'

// A download is written here next to the chosen file, which it replaces only once complete.
export const PART_FILE_SUFFIX = '.part'
