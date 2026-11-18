import {
  DeleteObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  RestoreObjectCommand,
  S3Client
} from '@aws-sdk/client-s3'
import { mockClient } from 'aws-sdk-client-mock'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { S3Service } from '../../../../src/main/services/s3-service'
import type { S3Access } from '../../../../src/main/types/credential-types'
import { describeError } from '../../../../src/main/utils/error-utils'

const s3 = mockClient(S3Client)
const service = new S3Service()
const KEYS = {
  platform: 's3',
  accessKeyId: 'AKIAEXAMPLEKEY000001',
  secretAccessKey: 'secret'
} as const
const BUCKET: S3Access = { platform: 's3', bucket: 'b1', region: 'eu-west-1', credentials: KEYS }
const MODIFIED = new Date('2026-11-01T10:00:00Z')

const failure = (status: number, headers: Record<string, string>): Error =>
  Object.assign(new Error('failed'), {
    name: status === 404 ? 'NotFound' : 'Forbidden',
    $metadata: { httpStatusCode: status },
    $response: { statusCode: status, headers }
  })

beforeEach(() => {
  s3.reset()
})
afterAll(() => {
  s3.restore()
})

describe('findRegion', () => {
  it('uses the region S3 reports for a bucket the keys can see', async () => {
    s3.on(HeadBucketCommand, { Bucket: 'b1' }).resolves({ BucketRegion: 'eu-west-1' })
    expect(await service.findRegion(KEYS, 'b1')).toBe('eu-west-1')
  })

  it('reads the region from a denied request, so upload-only keys work', async () => {
    s3.on(HeadBucketCommand).rejects(failure(403, { 'x-amz-bucket-region': 'ap-south-1' }))
    expect(await service.findRegion(KEYS, 'b1')).toBe('ap-south-1')
  })

  it('fails for a bucket that does not exist', async () => {
    s3.on(HeadBucketCommand).rejects(failure(404, { 'x-amz-bucket-region': 'us-east-1' }))
    await expect(service.findRegion(KEYS, 'b1')).rejects.toThrow()
  })

  it('fails when S3 names no region', async () => {
    s3.on(HeadBucketCommand).rejects(failure(403, {}))
    await expect(service.findRegion(KEYS, 'b1')).rejects.toThrow()
  })
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
    expect(await service.listFolder(BUCKET, 'a/', null)).toEqual({
      folders: [{ id: 'a/b/', name: 'b' }],
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
    expect(await service.listFolder(BUCKET, '', 'page-2')).toEqual({
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
    const listing = await service.listFolder(BUCKET, '', null)
    expect(listing.files.map((file) => [file.name, file.storageClass, file.access])).toEqual([
      ['cold.zip', 'DEEP_ARCHIVE', { state: 'archived' }],
      ['warming.zip', 'DEEP_ARCHIVE', { state: 'restoring' }],
      ['warm.zip', 'GLACIER', { state: 'restored', until: until.toISOString() }]
    ])
  })
})

describe('uploadFile', () => {
  it('does nothing once cancelled', async () => {
    const controller = new AbortController()
    controller.abort()
    const upload = service.uploadFile(BUCKET, {
      key: 'k',
      storageClass: 'STANDARD',
      filePath: 'never-read.txt',
      fileSize: 0,
      partSize: 8,
      uploadId: null,
      parts: [],
      signal: controller.signal,
      onCreated: () => undefined,
      onPart: () => undefined,
      onProgress: () => undefined
    })
    await expect(upload).rejects.toMatchObject({ name: 'AbortError' })
    expect(s3.commandCalls(PutObjectCommand)).toHaveLength(0)
  })
})

describe('deleteFile', () => {
  it('deletes exactly the given key', async () => {
    s3.on(DeleteObjectCommand).resolves({})
    await service.deleteFile(BUCKET, 'a/old.pdf')
    expect(s3.commandCalls(DeleteObjectCommand)[0].args[0].input).toEqual({
      Bucket: 'b1',
      Key: 'a/old.pdf'
    })
  })
})

describe('restoreFile', () => {
  it('asks for a restore with the chosen tier and number of days', async () => {
    s3.on(RestoreObjectCommand).resolves({})
    await service.restoreFile(BUCKET, 'cold.zip', 'Bulk', 7)
    expect(s3.commandCalls(RestoreObjectCommand)[0].args[0].input).toEqual({
      Bucket: 'b1',
      Key: 'cold.zip',
      RestoreRequest: { Days: 7, GlacierJobParameters: { Tier: 'Bulk' } }
    })
  })

  it('explains a restore that is already running', async () => {
    s3.on(RestoreObjectCommand).rejects(
      Object.assign(new Error('x'), { name: 'RestoreAlreadyInProgress' })
    )
    const failed = await service
      .restoreFile(BUCKET, 'cold.zip', 'Standard', 1)
      .catch((error: unknown) => describeError(error))
    expect(failed).toBe('A restore of this file is already in progress.')
  })
})
