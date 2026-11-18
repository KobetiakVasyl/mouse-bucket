import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { mockClient } from 'aws-sdk-client-mock'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { accessOf, listFolder } from './list'

const s3 = mockClient(S3Client)
const client = new S3Client({
  region: 'eu-west-1',
  credentials: { accessKeyId: 'AKIAEXAMPLEKEY000001', secretAccessKey: 'secret' }
})
const MODIFIED = new Date('2026-11-01T10:00:00Z')

beforeEach(() => {
  s3.reset()
})
afterAll(() => {
  s3.restore()
})

describe('listFolder', () => {
  it('lists one level: subfolders, and files without the folder marker', async () => {
    s3.on(ListObjectsV2Command, { Bucket: 'b1', Prefix: 'a/', Delimiter: '/' }).resolves({
      CommonPrefixes: [{ Prefix: 'a/b/' }],
      Contents: [
        { Key: 'a/', Size: 0, LastModified: MODIFIED },
        { Key: 'a/report.pdf', Size: 2048, LastModified: MODIFIED }
      ],
      IsTruncated: false
    })
    expect(await listFolder(client, 'b1', 'a/', null)).toEqual({
      folders: ['a/b/'],
      files: [
        {
          key: 'a/report.pdf',
          name: 'report.pdf',
          size: 2048,
          lastModified: MODIFIED.toISOString(),
          storageClass: 'STANDARD',
          access: { state: 'available' }
        }
      ],
      nextToken: null
    })
  })

  it('passes the continuation token and returns the next one', async () => {
    s3.on(ListObjectsV2Command, { ContinuationToken: 'page-2' }).resolves({
      IsTruncated: true,
      NextContinuationToken: 'page-3'
    })
    expect(await listFolder(client, 'b1', '', 'page-2')).toEqual({
      folders: [],
      files: [],
      nextToken: 'page-3'
    })
  })

  it('asks for the restore status and reports each archived file', async () => {
    const until = new Date('2026-12-01T00:00:00Z')
    s3.on(ListObjectsV2Command, { OptionalObjectAttributes: ['RestoreStatus'] }).resolves({
      Contents: [
        { Key: 'cold.zip', Size: 1, LastModified: MODIFIED, StorageClass: 'DEEP_ARCHIVE' },
        {
          Key: 'warming.zip',
          Size: 1,
          LastModified: MODIFIED,
          StorageClass: 'DEEP_ARCHIVE',
          RestoreStatus: { IsRestoreInProgress: true }
        },
        {
          Key: 'warm.zip',
          Size: 1,
          LastModified: MODIFIED,
          StorageClass: 'GLACIER',
          RestoreStatus: { IsRestoreInProgress: false, RestoreExpiryDate: until }
        }
      ]
    })
    const listing = await listFolder(client, 'b1', '', null)
    expect(listing.files.map((file) => [file.name, file.storageClass, file.access])).toEqual([
      ['cold.zip', 'DEEP_ARCHIVE', { state: 'archived' }],
      ['warming.zip', 'DEEP_ARCHIVE', { state: 'restoring' }],
      ['warm.zip', 'GLACIER', { state: 'restored', until: until.toISOString() }]
    ])
  })
})

describe('accessOf', () => {
  it('needs no restore outside the archive classes', () => {
    expect(accessOf('STANDARD', undefined)).toEqual({ state: 'available' })
    expect(accessOf('GLACIER_IR', undefined)).toEqual({ state: 'available' })
  })
})
