import { describe, expect, it } from 'vitest'
import type { FolderListing, StoredFile } from '../../../../../src/shared/types/storage-types'
import {
  accessNote,
  appendListing,
  archivedFiles,
  deletedMessage,
  deleteWarning,
  downloadableFiles,
  fileCount,
  folderOf,
  isDownloadable,
  isEmptyFolder,
  namesWithMore,
  restoreTimesFor,
  restoringMessage,
  samePlace,
  selectedFiles
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
