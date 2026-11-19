import { describe, expect, it } from 'vitest'
import type { FolderListing, StoredFile } from '../../../../../src/shared/types/storage-types'
import {
  accessNote,
  addSummaries,
  appendListing,
  archivedFiles,
  archivedInsideLine,
  deletedMessage,
  deleteTitle,
  deleteWarning,
  downloadableFiles,
  fileCount,
  folderDownloadMessage,
  folderOf,
  insideLine,
  isDownloadable,
  isEmptyFolder,
  namesWithMore,
  nextSort,
  restoreTimesFor,
  restoreWhat,
  restoringMessage,
  samePlace,
  selectedFiles,
  selectionLabel,
  sortFiles
} from '../../../../../src/renderer/src/utils/download-utils'

const file = (key: string, access: StoredFile['access'] = { state: 'available' }): StoredFile => ({
  key,
  name: key,
  size: 1,
  lastModified: '2026-11-01T09:30:00.000Z',
  storageClass: 'DEEP_ARCHIVE',
  access
})

describe('folderOf and samePlace', () => {
  const photos = { id: 'photos/', name: 'photos' }
  const year = { id: 'photos/2025/', name: '2025' }

  it('lists the last folder opened, or the top', () => {
    expect(folderOf({ templateId: 'a', path: [] })).toBe('')
    expect(folderOf({ templateId: 'a', path: [photos, year] })).toBe('photos/2025/')
  })

  it('matches the template and the folder', () => {
    const place = { templateId: 'a', path: [photos] }
    expect(samePlace(place, { ...place })).toBe(true)
    expect(samePlace(place, { templateId: 'b', path: [photos] })).toBe(false)
    expect(samePlace(place, { templateId: 'a', path: [] })).toBe(false)
  })
})

describe('isDownloadable', () => {
  it('offers available and restored files, not archived or restoring ones', () => {
    expect(isDownloadable(file('a'))).toBe(true)
    expect(
      isDownloadable(file('b', { state: 'restored', until: '2026-12-01T00:00:00.000Z' }))
    ).toBe(true)
    expect(isDownloadable(file('c', { state: 'archived' }))).toBe(false)
    expect(isDownloadable(file('d', { state: 'restoring' }))).toBe(false)
  })
})

describe('accessNote', () => {
  it('says what an archived file needs, and nothing for an available one', () => {
    expect(accessNote({ state: 'available' })).toBe('')
    expect(accessNote({ state: 'archived' })).toBe('Archived')
    expect(accessNote({ state: 'restoring' })).toBe('Restoring…')
    expect(accessNote({ state: 'restored', until: '2026-12-01T00:00:00.000Z' })).toMatch(
      /^Restored until /
    )
    expect(accessNote({ state: 'unavailable', reason: 'No content.' })).toBe('No content.')
  })
})

describe('isEmptyFolder and appendListing', () => {
  it('tell an empty folder apart, and add the next page to the shown ones', () => {
    const folder = { id: 'a/', name: 'a' }
    const first: FolderListing = { folders: [folder], files: [file('x')], nextToken: 'next' }
    const second: FolderListing = { folders: [], files: [file('y')], nextToken: null }
    expect(isEmptyFolder({ folders: [], files: [], nextToken: null })).toBe(true)
    expect(isEmptyFolder(first)).toBe(false)
    expect(appendListing(first, second)).toEqual({
      folders: [folder],
      files: [file('x'), file('y')],
      nextToken: null
    })
  })
})

describe('selected files', () => {
  const files = [
    file('a.pdf'),
    file('b.zip', { state: 'archived' }),
    file('c.zip', { state: 'restoring' }),
    file('d.zip', { state: 'restored', until: '2026-12-01T00:00:00.000Z' })
  ]

  it('keeps the listing order and splits them by what can be done', () => {
    const chosen = selectedFiles(files, new Set(['d.zip', 'b.zip', 'a.pdf']))
    expect(chosen.map((chosenFile) => chosenFile.key)).toEqual(['a.pdf', 'b.zip', 'd.zip'])
    expect(downloadableFiles(chosen).map((chosenFile) => chosenFile.key)).toEqual([
      'a.pdf',
      'd.zip'
    ])
    expect(archivedFiles(chosen).map((chosenFile) => chosenFile.key)).toEqual(['b.zip'])
  })

  it('names one file or counts several', () => {
    expect(fileCount(1)).toBe('1 file')
    expect(fileCount(3)).toBe('3 files')
    expect(deletedMessage([files[0]], 's3')).toBe('Deleted a.pdf.')
    expect(deletedMessage(files, 'azure')).toBe('Deleted 4 files.')
    expect(deletedMessage(files, 'google-drive')).toBe('Moved 4 files to the trash.')
    expect(restoringMessage(files.slice(0, 2), 's3')).toContain('S3 is restoring 2 files')
    expect(restoringMessage(files.slice(0, 1), 'azure')).toContain('Azure is rehydrating a.pdf')
  })

  it('says what deleting does on each platform', () => {
    expect(deleteWarning('s3', 'archive', 1)).toBe(
      "is deleted from the bucket archive. The app can't bring it back."
    )
    expect(deleteWarning('azure', 'backups', 2)).toContain('are deleted from the container backups')
    expect(deleteWarning('google-drive', 'Photos', 1)).toBe(
      'goes to the Google Drive trash, where it stays for 30 days.'
    )
  })

  it('lists the first five names, then how many more', () => {
    const many = ['1', '2', '3', '4', '5', '6', '7'].map((name) => file(name))
    expect(namesWithMore(many.slice(0, 2))).toBe('1, 2')
    expect(namesWithMore(many)).toBe('1, 2, 3, 4, 5 and 2 more')
  })

  it('gives the restore times of the slowest archive class', () => {
    const flexible = { ...file('f'), storageClass: 'GLACIER' }
    expect(restoreTimesFor([flexible])).toEqual({
      Standard: 'in 3 to 5 hours',
      Bulk: 'in 5 to 12 hours'
    })
    expect(restoreTimesFor([flexible, file('g')])?.Bulk).toBe('within 48 hours')
    expect(restoreTimesFor([{ ...file('h'), storageClass: 'STANDARD' }])).toBeUndefined()
  })
})

describe('selected folders', () => {
  const photos = { id: 'photos/', name: 'photos' }
  const music = { id: 'music/', name: 'music' }

  it('counts folders and files together', () => {
    expect(selectionLabel(0, 2)).toBe('2 folders')
    expect(selectionLabel(3, 0)).toBe('3 files')
    expect(selectionLabel(4, 1)).toBe('1 folder and 4 files')
    expect(deleteTitle([], [photos])).toBe('Delete this folder?')
    expect(deleteTitle([file('a')], [])).toBe('Delete this file?')
    expect(deleteTitle([file('a')], [photos])).toBe('Delete 1 folder and 1 file?')
  })

  it('adds up what the folders hold, and says so', () => {
    const total = addSummaries([
      { files: 1, bytes: 4_200_000, archived: 0 },
      { files: 2, bytes: 0, archived: 2 }
    ])
    expect(total).toEqual({ files: 3, bytes: 4_200_000, archived: 2 })
    expect(insideLine([photos], null)).toBe("Counting what's inside 1 folder…")
    expect(insideLine([photos], { files: 1, bytes: 4_200_000, archived: 0 })).toBe(
      'Inside the folder, at any depth: 1 file, 4.0 MB.'
    )
    expect(insideLine([photos, music], total)).toMatch(/^Inside the folders, at any depth: 3 files/)
    expect(archivedInsideLine([photos], null)).toBe('Counting the archived files inside…')
    expect(archivedInsideLine([photos], { files: 1, bytes: 1, archived: 0 })).toBe(
      'Nothing inside the folder is archived.'
    )
    expect(archivedInsideLine([photos, music], { files: 1, bytes: 1, archived: 0 })).toBe(
      'Nothing inside the folders is archived.'
    )
    expect(archivedInsideLine([photos, music], total)).toBe('2 files inside are archived.')
  })

  it('names what a restore, a delete and a download covered', () => {
    expect(restoreWhat([file('a')], [])).toBe('a')
    expect(restoreWhat([], [photos])).toBe('the archived files inside 1 folder')
    expect(restoreWhat([file('a'), file('b')], [photos, music])).toBe(
      '2 files and the archived files inside 2 folders'
    )
    expect(deletedMessage([], 's3', [photos])).toBe('Deleted photos.')
    expect(deletedMessage([file('a')], 'google-drive', [photos])).toBe(
      'Moved 1 folder and 1 file to the trash.'
    )
    expect(restoringMessage([], 's3', 1)).toBe(
      'S3 is restoring 1 file. Download it once the list shows it as restored.'
    )
    expect(restoringMessage([file('a')], 'azure', 2)).toMatch(/^Azure is rehydrating 3 files\./)
    expect(folderDownloadMessage(0, [{ queued: 1, skipped: 0, savedAs: 'photos' }])).toBe(
      'Downloading 1 file into your download folder, with folders saved as photos.'
    )
    expect(
      folderDownloadMessage(2, [
        { queued: 3, skipped: 1, savedAs: 'photos (2)' },
        { queued: 1, skipped: 0, savedAs: 'music' },
        { queued: 0, skipped: 0, savedAs: 'empty' }
      ])
    ).toBe(
      "Downloading 6 files into your download folder, with folders saved as photos (2) and music. 1 file that can't be downloaded now, such as an archived one, was skipped."
    )
    expect(folderDownloadMessage(1, [{ queued: 0, skipped: 0, savedAs: 'empty' }])).toBe(
      'Downloading 1 file into your download folder.'
    )
    expect(folderDownloadMessage(0, [{ queued: 0, skipped: 2, savedAs: 'photos' }])).toBe(
      "Nothing was downloaded. 2 files that can't be downloaded now, such as archived ones, were skipped."
    )
  })
})

describe('sortFiles and nextSort', () => {
  const dated = (name: string, lastModified: string): StoredFile => ({
    ...file(name),
    lastModified
  })
  const files = [
    dated('b10.txt', '2026-11-03T00:00:00.000Z'),
    dated('B2.txt', '2026-11-01T00:00:00.000Z'),
    dated('a.txt', '2026-11-03T00:00:00.000Z'),
    dated('no-date.txt', '')
  ]
  const names = (sorted: StoredFile[]): string[] => sorted.map((sortedFile) => sortedFile.name)

  it('sorts names naturally, ignoring case, either way', () => {
    expect(names(sortFiles(files, { by: 'name', direction: 'ascending' }))).toEqual([
      'a.txt',
      'B2.txt',
      'b10.txt',
      'no-date.txt'
    ])
    expect(names(sortFiles(files, { by: 'name', direction: 'descending' }))[0]).toBe('no-date.txt')
  })

  it('sorts by date, keeping name order for the same date, with undated files oldest', () => {
    expect(names(sortFiles(files, { by: 'modified', direction: 'descending' }))).toEqual([
      'a.txt',
      'b10.txt',
      'B2.txt',
      'no-date.txt'
    ])
    expect(names(sortFiles(files, { by: 'modified', direction: 'ascending' }))[0]).toBe(
      'no-date.txt'
    )
  })

  it('turns the sorted column round, and starts another column its own first way', () => {
    const byName = { by: 'name', direction: 'ascending' } as const
    expect(nextSort(byName, 'name')).toEqual({ by: 'name', direction: 'descending' })
    expect(nextSort(byName, 'modified')).toEqual({ by: 'modified', direction: 'descending' })
    expect(nextSort({ by: 'modified', direction: 'descending' }, 'name')).toEqual(byName)
  })
})
