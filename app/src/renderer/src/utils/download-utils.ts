// What the Download page shows for a place, a folder and a file. See docs/UI.md.
import type { FileAccess, FolderListing, S3File } from '../../../shared/types/s3-types'
import { DOWNLOADABLE_STATES } from '../constants/download-constants'
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
