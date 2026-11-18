// How every platform splits an upload into parts, and where a download is written until it's complete. See
// docs/ARCHITECTURE.md.
const MiB = 1024 * 1024

// Parts are whole MiB, which also suits Google Drive's chunks: multiples of 256 KiB.
export const PART_SIZE_STEP = MiB
export const MIN_PART_SIZE = 8 * MiB
// S3's limit on the parts of one upload, the lowest of the platforms.
export const MAX_PARTS = 10_000
// How many parts of one file are sent at once, where the platform allows it.
export const PARTS_AT_ONCE = 4

// A download is written here next to the chosen file, which it replaces only once complete.
export const PART_FILE_SUFFIX = '.part'
