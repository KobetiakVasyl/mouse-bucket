// What the Browse page shows for a place, a folder and a file, on each platform. See docs/UI.md.
import type {
  FileAccess,
  FolderDownload,
  FolderEntry,
  FolderListing,
  FolderSummary,
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
import { formatBytes, formatDate } from './format-utils'
import { matchesSearch } from './search-utils'

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
export function namesWithMore(files: { name: string }[]): string {
  const names = files.slice(0, LISTED_NAMES).map((file) => file.name)
  const more = files.length - names.length
  return more === 0 ? names.join(', ') : `${names.join(', ')} and ${more} more`
}

export function downloadsStartedMessage(count: number): string {
  return `Downloading ${fileCount(count)}. They're in the transfers below.`
}

// Google Drive moves deleted files and folders to its trash.
export function deletedMessage(
  files: StoredFile[],
  platform: Platform,
  folders: FolderEntry[] = []
): string {
  const items = [...folders, ...files]
  const what = items.length === 1 ? items[0].name : selectionLabel(files.length, folders.length)
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
// `inFolders` counts the archived files restored inside selected folders.
export function restoringMessage(files: StoredFile[], platform: Platform, inFolders = 0): string {
  const count = files.length + inFolders
  const what = count === 1 && files.length === 1 ? files[0].name : fileCount(count)
  const it = count === 1 ? 'it' : 'them'
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

export function folderCount(count: number): string {
  return count === 1 ? '1 folder' : `${count} folders`
}

// The selection, such as "2 folders and 3 files".
export function selectionLabel(files: number, folders: number): string {
  if (folders === 0) return fileCount(files)
  if (files === 0) return folderCount(folders)
  return `${folderCount(folders)} and ${fileCount(files)}`
}

// What several folders hold together.
export function addSummaries(summaries: FolderSummary[]): FolderSummary {
  return summaries.reduce(
    (total, summary) => ({
      files: total.files + summary.files,
      bytes: total.bytes + summary.bytes,
      archived: total.archived + summary.archived
    }),
    { files: 0, bytes: 0, archived: 0 }
  )
}

// What the selected folders hold, for the Delete dialog.
export function insideLine(folders: FolderEntry[], inside: FolderSummary | null): string {
  const where = folders.length === 1 ? 'Inside the folder' : 'Inside the folders'
  if (inside === null) return `Counting what's inside ${folderCount(folders.length)}…`
  return `${where}, at any depth: ${fileCount(inside.files)}, ${formatBytes(inside.bytes)}.`
}

// What downloading files and whole folders started, and what it skipped.
export function folderDownloadMessage(files: number, results: FolderDownload[]): string {
  const queued = files + results.reduce((total, result) => total + result.queued, 0)
  const skipped = results.reduce((total, result) => total + result.skipped, 0)
  const into = results.filter((result) => result.queued > 0).map((result) => result.savedAs)
  const saved =
    into.length === 1 ? into[0] : `${into.slice(0, -1).join(', ')} and ${into.at(-1) ?? ''}`
  const started =
    queued === 0
      ? 'Nothing was downloaded.'
      : into.length === 0
        ? `Downloading ${fileCount(queued)} into your download folder.`
        : `Downloading ${fileCount(queued)} into your download folder, with folders saved as ${saved}.`
  if (skipped === 0) return started
  return skipped === 1
    ? `${started} 1 file that can't be downloaded now, such as an archived one, was skipped.`
    : `${started} ${skipped} files that can't be downloaded now, such as archived ones, were skipped.`
}

// What a Restore dialog restores: one file by name, or the selected files and the archived files inside the folders.
export function restoreWhat(files: StoredFile[], folders: FolderEntry[]): string {
  if (folders.length === 0) return files.length === 1 ? files[0].name : fileCount(files.length)
  const inside = `the archived files inside ${folderCount(folders.length)}`
  return files.length === 0 ? inside : `${fileCount(files.length)} and ${inside}`
}

// How many archived files the selected folders hold, once counted.
export function archivedInsideLine(folders: FolderEntry[], inside: FolderSummary | null): string {
  if (inside === null) return 'Counting the archived files inside…'
  if (inside.archived === 0) {
    return `Nothing inside the ${folders.length === 1 ? 'folder' : 'folders'} is archived.`
  }
  return `${fileCount(inside.archived)} inside ${inside.archived === 1 ? 'is' : 'are'} archived.`
}

// The Delete dialog's title, naming one file or folder, or counting the selection.
export function deleteTitle(files: StoredFile[], folders: FolderEntry[]): string {
  if (files.length + folders.length > 1)
    return `Delete ${selectionLabel(files.length, folders.length)}?`
  return folders.length === 1 ? 'Delete this folder?' : 'Delete this file?'
}

// The loaded folders and files whose names match the search, keeping the token for the next page.
export function filterListing(listing: FolderListing, query: string): FolderListing {
  return {
    folders: listing.folders.filter((entry) => matchesSearch([entry.name], query)),
    files: listing.files.filter((file) => matchesSearch([file.name], query)),
    nextToken: listing.nextToken
  }
}

// What the Load more row says while the sort or the search covers only the entries loaded so far.
export function loadedSoFarNote(sort: FileSort, searching: boolean): string | null {
  const byDate = sort.by === 'modified'
  if (byDate && searching) return 'The sort and the search cover the entries loaded so far.'
  if (byDate) return 'The sort covers the entries loaded so far.'
  if (searching) return 'The search covers the entries loaded so far.'
  return null
}
