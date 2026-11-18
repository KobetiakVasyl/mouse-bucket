// What the Browse page shows for a place, a folder and a file, on each platform. See docs/UI.md.
import type {
  FileAccess,
  FolderListing,
  RestoreTier,
  StoredFile
} from '../../../shared/types/storage-types'
import type { Platform } from '../../../shared/types/template-types'
import {
  ARCHIVE_CLASSES_SLOWEST_FIRST,
  DOWNLOADABLE_STATES,
  FIRST_SORT_DIRECTIONS,
  LISTED_NAMES,
  RESTORE_TIMES
} from '../constants/download-constants'
import type { FileSort, FileSortKey, FolderPlace } from '../types/download-types'
import { formatDate } from './format-utils'

// The folder a place lists: the last one opened, or '' for the template's top.
export function folderOf(place: FolderPlace): string {
  return place.path.length === 0 ? '' : place.path[place.path.length - 1].id
}

export function samePlace(a: FolderPlace, b: FolderPlace): boolean {
  return a.templateId === b.templateId && folderOf(a) === folderOf(b)
}

export function isDownloadable(file: StoredFile): boolean {
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
    case 'unavailable':
      return access.reason
  }
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

export function downloadableFiles(files: StoredFile[]): StoredFile[] {
  return files.filter(isDownloadable)
}

export function archivedFiles(files: StoredFile[]): StoredFile[] {
  return files.filter((file) => file.access.state === 'archived')
}

// The listed files whose keys are selected, in the listing's order.
export function selectedFiles(files: StoredFile[], keys: ReadonlySet<string>): StoredFile[] {
  return files.filter((file) => keys.has(file.key))
}

// The usual restore times of the slowest class among the files, or undefined when none is archived.
export function restoreTimesFor(files: StoredFile[]): Record<RestoreTier, string> | undefined {
  const classes = new Set(files.map((file) => file.storageClass))
  const slowest = ARCHIVE_CLASSES_SLOWEST_FIRST.find((storageClass) => classes.has(storageClass))
  return slowest === undefined ? undefined : RESTORE_TIMES.get(slowest)
}

// The first few names, then how many more there are.
export function namesWithMore(files: StoredFile[]): string {
  const names = files.slice(0, LISTED_NAMES).map((file) => file.name)
  const more = files.length - names.length
  return more === 0 ? names.join(', ') : `${names.join(', ')} and ${more} more`
}

export function downloadsStartedMessage(count: number): string {
  return `Downloading ${fileCount(count)}. They're in the transfers below.`
}

// Google Drive moves deleted files to its trash.
export function deletedMessage(files: StoredFile[], platform: Platform): string {
  const what = files.length === 1 ? files[0].name : fileCount(files.length)
  return platform === 'google-drive' ? `Moved ${what} to the trash.` : `Deleted ${what}.`
}

// What deleting does to the files on each platform, after their names in the Delete dialog.
export function deleteWarning(platform: Platform, root: string, count: number): string {
  const one = count === 1
  if (platform === 'google-drive') {
    return `${one ? 'goes' : 'go'} to the Google Drive trash, where ${one ? 'it stays' : 'they stay'} for 30 days.`
  }
  const where = platform === 's3' ? `the bucket ${root}` : `the container ${root}`
  return `${one ? 'is' : 'are'} deleted from ${where}. The app can't bring ${one ? 'it' : 'them'} back.`
}

// S3 restores a temporary copy; Azure rehydrates the blob into another tier, after which it's simply available.
export function restoringMessage(files: StoredFile[], platform: Platform): string {
  const what = files.length === 1 ? files[0].name : fileCount(files.length)
  const it = files.length === 1 ? 'it' : 'them'
  if (platform === 'azure') {
    return `Azure is rehydrating ${what}. Download ${it} once the list no longer shows ${it} as archived.`
  }
  return `S3 is restoring ${what}. Download ${it} once the list shows ${it} as restored.`
}

// The sort after clicking a column: the other way round on the column already sorted, otherwise that column's first way.
export function nextSort(current: FileSort, by: FileSortKey): FileSort {
  if (current.by !== by) return { by, direction: FIRST_SORT_DIRECTIONS[by] }
  return { by, direction: current.direction === 'ascending' ? 'descending' : 'ascending' }
}

// When a file was last changed, in milliseconds; a file without a date, as Google Drive may send, counts as the oldest.
function modifiedMs(file: StoredFile): number {
  const ms = Date.parse(file.lastModified)
  return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms
}

function byName(a: StoredFile, b: StoredFile): number {
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
}

// The files in the chosen order. Files with the same date keep name order.
export function sortFiles(files: StoredFile[], sort: FileSort): StoredFile[] {
  const sign = sort.direction === 'ascending' ? 1 : -1
  return [...files].sort((a, b) => {
    if (sort.by === 'name') return sign * byName(a, b)
    const difference = modifiedMs(a) - modifiedMs(b)
    return difference === 0 ? byName(a, b) : sign * Math.sign(difference)
  })
}
