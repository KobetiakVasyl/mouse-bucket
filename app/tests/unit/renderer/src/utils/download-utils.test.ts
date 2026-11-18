import { describe, expect, it } from 'vitest'
import type { FolderListing, S3File } from '../../../../../src/shared/types/s3-types'
import {
  accessNote,
  appendListing,
  folderCrumbs,
  folderName,
  isDownloadable,
  isEmptyFolder,
  samePlace
} from '../../../../../src/renderer/src/utils/download-utils'

const file = (key: string, access: S3File['access'] = { state: 'available' }): S3File => ({
  key,
  name: key,
  size: 1,
  lastModified: '2026-11-01T09:30:00.000Z',
  storageClass: 'DEEP_ARCHIVE',
  access
})

describe('samePlace', () => {
  it('matches the template and the folder', () => {
    const place = { templateId: 'a', prefix: 'photos/' }
    expect(samePlace(place, { ...place })).toBe(true)
    expect(samePlace(place, { templateId: 'b', prefix: 'photos/' })).toBe(false)
    expect(samePlace(place, { templateId: 'a', prefix: '' })).toBe(false)
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
  })
})

describe('folderCrumbs', () => {
  it('lists each folder on the way with its full prefix', () => {
    expect(folderCrumbs('')).toEqual([])
    expect(folderCrumbs('photos/2025/')).toEqual([
      { name: 'photos', prefix: 'photos/' },
      { name: '2025', prefix: 'photos/2025/' }
    ])
  })
})

describe('folderName', () => {
  it('drops the open folder from a subfolder', () => {
    expect(folderName('photos/2025/', 'photos/')).toBe('2025/')
  })
})

describe('isEmptyFolder and appendListing', () => {
  it('tell an empty folder apart, and add the next page to the shown ones', () => {
    const first: FolderListing = { folders: ['a/'], files: [file('x')], nextToken: 'next' }
    const second: FolderListing = { folders: [], files: [file('y')], nextToken: null }
    expect(isEmptyFolder({ folders: [], files: [], nextToken: null })).toBe(true)
    expect(isEmptyFolder(first)).toBe(false)
    expect(appendListing(first, second)).toEqual({
      folders: ['a/'],
      files: [file('x'), file('y')],
      nextToken: null
    })
  })
})
