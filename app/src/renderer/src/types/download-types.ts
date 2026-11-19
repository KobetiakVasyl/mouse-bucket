// Where the Browse page is, what it shows there, and which dialog is open. See docs/UI.md.
import type {
  FolderEntry,
  FolderListing,
  FolderSummary,
  StoredFile
} from '../../../shared/types/storage-types'

// Which template, and the folders opened on the way from its top: none for the top itself.
export interface FolderPlace {
  templateId: string
  path: FolderEntry[]
}

// A listing remembers the place it belongs to, so a stale one is never shown.
export type ShownFolder =
  | { place: FolderPlace; state: 'loaded'; listing: FolderListing }
  | { place: FolderPlace; state: 'failed'; error: string }

// What the selected folders hold, while it's being counted (null) and once it is. With no folder selected, nothing.
export type FoldersCount = FolderSummary | null

// The dialogs act on one file, or on the selected files and folders, with what the folders hold.
export type FileDialog =
  | { kind: 'none' }
  | { kind: 'delete'; files: StoredFile[]; folders: FolderEntry[]; inside: FoldersCount }
  | { kind: 'restore'; files: StoredFile[]; folders: FolderEntry[]; inside: FoldersCount }

// The columns the files can be sorted by, and which way.
export type FileSortKey = 'name' | 'modified'
export type SortDirection = 'ascending' | 'descending'

export interface FileSort {
  by: FileSortKey
  direction: SortDirection
}
