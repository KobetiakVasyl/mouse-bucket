// What every upload sends to S3, and how long a restore may last. See docs/ARCHITECTURE.md.
export const UPLOAD_STORAGE_CLASS = 'DEEP_ARCHIVE'
export const UPLOAD_CHECKSUM = 'CRC64NVME'

// How many days a restored copy may stay.
export const RESTORE_DAYS = { min: 1, max: 365 } as const
