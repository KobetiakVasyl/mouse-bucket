// Where the Browse page is, what it shows there, and which dialog is open. See docs/UI.md.
import type { FolderEntry, FolderListing, StoredFile } from '../../../shared/types/storage-types'

// Which template, and the folders opened on the way from its top: none for the top itself.
export interface FolderPlace {
  templateId: string
  path: FolderEntry[]
}

// A listing remembers the place it belongs to, so a stale one is never shown.
export type ShownFolder =
  | { place: FolderPlace; state: 'loaded'; listing: FolderListing }
  | { place: FolderPlace; state: 'failed'; error: string }

// The dialogs act on one file or on the selected files.
export type FileDialog =
  | { kind: 'none' }
  | { kind: 'delete'; files: StoredFile[] }
  | { kind: 'restore'; files: StoredFile[] }
