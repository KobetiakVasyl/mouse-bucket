// How whole folders are worked through on every platform. See docs/ARCHITECTURE.md.

// How many restores or deletes of one folder's files run at once.
export const FOLDER_REQUESTS_AT_ONCE = 8

// Files in these states can be downloaded now; the others are skipped when a whole folder downloads.
export const DOWNLOADABLE_STATES: ReadonlySet<string> = new Set(['available', 'restored'])

// The most objects one S3 DeleteObjects request may name.
export const S3_DELETE_BATCH = 1000
