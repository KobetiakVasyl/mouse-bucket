// Fixed values for talking to S3: the first region to ask, archived classes and the class S3 assumes. See
// docs/ARCHITECTURE.md.

// Any region works for the first request: S3 answers with the bucket's real region.
export const DISCOVERY_REGION = 'us-east-1'

// Files in these classes must be restored before they can be downloaded.
export const ARCHIVE_STORAGE_CLASSES: ReadonlySet<string> = new Set(['GLACIER', 'DEEP_ARCHIVE'])

// The storage class S3 reports for an object it lists without one.
export const DEFAULT_STORAGE_CLASS = 'STANDARD'
