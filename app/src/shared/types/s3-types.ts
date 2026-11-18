// S3 locations, folder listings and files, and the requests that browse, download, delete or restore them. See docs/ARCHITECTURE.md.
import type { z } from 'zod'
import type {
  DownloadRequestSchema,
  FolderRequestSchema,
  RestoreRequestSchema,
  RestoreTierSchema
} from '../validation/s3-validation'

export interface S3Location {
  bucket: string
  // Empty for the whole bucket, otherwise the folder's key prefix, ending with "/".
  prefix: string
}

// Whether a file can be downloaded now. Archived files need a restore first.
export type FileAccess =
  | { state: 'available' }
  | { state: 'archived' }
  | { state: 'restoring' }
  | { state: 'restored'; until: string }

export interface S3File {
  key: string
  name: string
  size: number
  lastModified: string
  // S3's name for it, such as DEEP_ARCHIVE.
  storageClass: string
  access: FileAccess
}

export interface FolderListing {
  folders: string[]
  files: S3File[]
  // null when this is the folder's last page.
  nextToken: string | null
}

export type FolderRequest = z.infer<typeof FolderRequestSchema>
export type DownloadRequest = z.infer<typeof DownloadRequestSchema>
export type RestoreTier = z.infer<typeof RestoreTierSchema>
export type RestoreRequest = z.infer<typeof RestoreRequestSchema>
