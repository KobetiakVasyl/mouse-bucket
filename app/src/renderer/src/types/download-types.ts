// Where the Download page's browser is, what it shows there, and which dialog is open. See docs/UI.md.
import type { FolderListing, S3File } from '../../../shared/types/s3-types'

// Which template's bucket, and which folder in it ('' for the top).
export interface FolderPlace {
  templateId: string
  prefix: string
}

// A listing remembers the place it belongs to, so a stale one is never shown.
export type ShownFolder =
  | { place: FolderPlace; state: 'loaded'; listing: FolderListing }
  | { place: FolderPlace; state: 'failed'; error: string }

// The dialogs act on one file or on the selected files.
export type FileDialog =
  { kind: 'none' } | { kind: 'delete'; files: S3File[] } | { kind: 'restore'; files: S3File[] }

// One folder of the breadcrumb: its name, and its full prefix.
export interface FolderCrumb {
  name: string
  prefix: string
}
