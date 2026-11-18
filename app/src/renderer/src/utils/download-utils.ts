// What the Download page shows for a place, a folder and a file. See docs/UI.md.
import type { FileAccess, FolderListing, RestoreTier, S3File } from '../../../shared/types/s3-types'
import {
  ARCHIVE_CLASSES_SLOWEST_FIRST,
  DOWNLOADABLE_STATES,
  LISTED_NAMES,
  RESTORE_TIMES
} from '../constants/download-constants'
import type { FolderCrumb, FolderPlace } from '../types/download-types'
import { formatDate } from './format-utils'

export function samePlace(a: FolderPlace, b: FolderPlace): boolean {
  return a.templateId === b.templateId && a.prefix === b.prefix
}

export function isDownloadable(file: S3File): boolean {
  return DOWNLOADABLE_STATES.has(file.access.state)
}

// The note under a file's storage class: '' for a file that's simply available.
export function accessNote(access: FileAccess): string {
  switch (access.state) {
    case 'available':
      return ''
    case 'archived':
      return 'Archived'
    case 'restoring':
      return 'Restoring…'
    case 'restored':
      return `Restored until ${formatDate(access.until)}`
  }
}

// Each folder on the way to `prefix`, for the breadcrumb.
export function folderCrumbs(prefix: string): FolderCrumb[] {
  const parts = prefix.split('/').filter((part) => part !== '')
  return parts.map((name, index) => ({ name, prefix: `${parts.slice(0, index + 1).join('/')}/` }))
}

// A subfolder's name inside the folder at `prefix`, such as "photos/".
export function folderName(folder: string, prefix: string): string {
  return folder.slice(prefix.length)
}

export function isEmptyFolder(listing: FolderListing): boolean {
  return listing.folders.length === 0 && listing.files.length === 0
}

// The next page of a folder, added to the pages already shown.
export function appendListing(shown: FolderListing, next: FolderListing): FolderListing {
  return {
    folders: [...shown.folders, ...next.folders],
    files: [...shown.files, ...next.files],
    nextToken: next.nextToken
  }
}

// Says where a download goes, and its new name when the file's own name was taken.
export function downloadStartedMessage(name: string, savedAs: string): string {
  const as = savedAs === name ? '' : ` as ${savedAs}, since that name was taken`
  return `Downloading ${name}${as}. It's in the transfers below.`
}

export function fileCount(count: number): string {
  return count === 1 ? '1 file' : `${count} files`
}

export function downloadableFiles(files: S3File[]): S3File[] {
  return files.filter(isDownloadable)
}

export function archivedFiles(files: S3File[]): S3File[] {
  return files.filter((file) => file.access.state === 'archived')
}

// The listed files whose keys are selected, in the listing's order.
export function selectedFiles(files: S3File[], keys: ReadonlySet<string>): S3File[] {
  return files.filter((file) => keys.has(file.key))
}

// The usual restore times of the slowest class among the files, or undefined when none is archived.
export function restoreTimesFor(files: S3File[]): Record<RestoreTier, string> | undefined {
  const classes = new Set(files.map((file) => file.storageClass))
  const slowest = ARCHIVE_CLASSES_SLOWEST_FIRST.find((storageClass) => classes.has(storageClass))
  return slowest === undefined ? undefined : RESTORE_TIMES.get(slowest)
}

// The first few names, then how many more there are.
export function namesWithMore(files: S3File[]): string {
  const names = files.slice(0, LISTED_NAMES).map((file) => file.name)
  const more = files.length - names.length
  return more === 0 ? names.join(', ') : `${names.join(', ')} and ${more} more`
}

export function downloadsStartedMessage(count: number): string {
  return `Downloading ${fileCount(count)}. They're in the transfers below.`
}

export function deletedMessage(files: S3File[]): string {
  return files.length === 1 ? `Deleted ${files[0].name}.` : `Deleted ${fileCount(files.length)}.`
}

export function restoringMessage(files: S3File[]): string {
  return files.length === 1
    ? `S3 is restoring ${files[0].name}. Download it once the list shows it as restored.`
    : `S3 is restoring ${fileCount(files.length)}. Download them once the list shows them as restored.`
}
