// Fixed values for talking to Azure Blob Storage: block names, archive states and folder markers. See
// docs/ARCHITECTURE.md.

// Every block of a blob needs an ID of the same length, so block numbers are padded to this many digits.
export const BLOCK_ID_DIGITS = 6

export const ARCHIVE_TIER = 'Archive'

// An archived blob that's being rehydrated reports an archive status starting with this.
export const REHYDRATING_PREFIX = 'rehydrate-pending-to-'

// Storage accounts with a hierarchical namespace keep each folder as an empty blob with this metadata.
export const FOLDER_MARKER_METADATA = 'hdi_isfolder'

// The most blobs one listing page holds.
export const LISTING_PAGE_SIZE = 1000

// Error codes for an address that doesn't answer, such as a storage account name that doesn't exist.
export const UNREACHABLE_CODES: ReadonlySet<string> = new Set(['REQUEST_SEND_ERROR', 'ENOTFOUND'])
