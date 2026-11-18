import type { BlobItem } from '@azure/storage-blob'
import { describe, expect, it } from 'vitest'
import {
  azureAccessOf,
  azureFilesOf,
  azureFoldersOf,
  blockId,
  containerUrl
} from '../../../../src/main/utils/azure-utils'

const MODIFIED = new Date('2026-11-01T10:00:00Z')
const blob = (
  name: string,
  properties: Partial<BlobItem['properties']> = {},
  metadata = {}
): BlobItem =>
  ({
    name,
    deleted: false,
    snapshot: '',
    metadata,
    properties: { lastModified: MODIFIED, etag: '"e"', contentLength: 5, ...properties }
  }) as BlobItem

describe('containerUrl and blockId', () => {
  it('address the container, and give every block an ID of the same length', () => {
    expect(containerUrl('myaccount', 'backups')).toBe(
      'https://myaccount.blob.core.windows.net/backups'
    )
    expect(Buffer.from(blockId(7), 'base64').toString()).toBe('block-000007')
    expect(blockId(1).length).toBe(blockId(10_000).length)
  })
})

describe('azureAccessOf', () => {
  it('needs a rehydrate only in the Archive tier, and shows one in progress', () => {
    expect(azureAccessOf('Hot')).toEqual({ state: 'available' })
    expect(azureAccessOf(undefined)).toEqual({ state: 'available' })
    expect(azureAccessOf('Archive')).toEqual({ state: 'archived' })
    expect(azureAccessOf('Archive', 'rehydrate-pending-to-hot')).toEqual({ state: 'restoring' })
  })
})

describe('azureFoldersOf and azureFilesOf', () => {
  it('list folders by prefix, and files without folder markers or the folder itself', () => {
    expect(azureFoldersOf([{ name: 'a/b/' }], 'a/')).toEqual([{ id: 'a/b/', name: 'b' }])
    expect(azureFoldersOf(undefined, '')).toEqual([])
    const files = azureFilesOf(
      [
        blob('a/'),
        blob('a/sub', {}, { hdi_isfolder: 'true' }),
        blob('a/x.zip', { accessTier: 'Archive' })
      ],
      'a/'
    )
    expect(files).toEqual([
      {
        key: 'a/x.zip',
        name: 'x.zip',
        size: 5,
        lastModified: MODIFIED.toISOString(),
        storageClass: 'Archive',
        access: { state: 'archived' }
      }
    ])
  })
})
