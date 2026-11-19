// Folder listings and files on any platform, and the requests that upload, browse, download, delete or restore them.
// See docs/ARCHITECTURE.md.
import type { z } from 'zod'
import type {
  AccessTierSchema,
  DownloadRequestSchema,
  FolderRequestSchema,
  FolderRestoreRequestSchema,
  FolderTargetRequestSchema,
  RehydratePrioritySchema,
  RehydrateTierSchema,
  RestoreOptionsSchema,
  RestoreRequestSchema,
  RestoreTierSchema,
  UploadClassSchema,
  UploadPathsRequestSchema,
  UploadRequestSchema,
  UploadStorageClassSchema
} from '../validation/storage-validation'

// Whether a file can be downloaded now. Archived files need a restore first; some files, such as Google Docs, can't be
// downloaded at all, for the reason given.
export type FileAccess =
  | { state: 'available' }
  | { state: 'archived' }
  | { state: 'restoring' }
  | { state: 'restored'; until: string }
  | { state: 'unavailable'; reason: string }

export interface StoredFile {
  // An S3 key, an Azure blob name or a Google Drive file ID.
  key: string
  name: string
  size: number
  lastModified: string
  // S3's storage class, such as DEEP_ARCHIVE, or Azure's access tier, such as Archive; '' on Google Drive.
  storageClass: string
  access: FileAccess
}

// A folder in a listing: its ID, which opens it, and its name.
export interface FolderEntry {
  id: string
  name: string
}

// What a folder holds at any depth, counted before acting on all of it.
export interface FolderSummary {
  files: number
  bytes: number
  // Files that need a restore before they can be downloaded.
  archived: number
}

// What downloading a whole folder queued: its files, the ones skipped because they can't be downloaded now, such as
// archived ones, and the name of the folder they go into in the download folder.
export interface FolderDownload {
  queued: number
  skipped: number
  savedAs: string
}

export interface FolderListing {
  folders: FolderEntry[]
  files: StoredFile[]
  // null when this is the folder's last page.
  nextToken: string | null
}

export type UploadStorageClass = z.infer<typeof UploadStorageClassSchema>
export type AccessTier = z.infer<typeof AccessTierSchema>
export type UploadClass = z.infer<typeof UploadClassSchema>
export type UploadRequest = z.infer<typeof UploadRequestSchema>
export type UploadPathsRequest = z.infer<typeof UploadPathsRequestSchema>
export type FolderRequest = z.infer<typeof FolderRequestSchema>
export type DownloadRequest = z.infer<typeof DownloadRequestSchema>
export type RestoreTier = z.infer<typeof RestoreTierSchema>
export type RehydrateTier = z.infer<typeof RehydrateTierSchema>
export type RehydratePriority = z.infer<typeof RehydratePrioritySchema>
export type RestoreOptions = z.infer<typeof RestoreOptionsSchema>
export type RestoreRequest = z.infer<typeof RestoreRequestSchema>
export type FolderTargetRequest = z.infer<typeof FolderTargetRequestSchema>
export type FolderRestoreRequest = z.infer<typeof FolderRestoreRequestSchema>
