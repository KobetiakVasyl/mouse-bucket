import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AzureBlobService } from '../../../../src/main/services/azure-blob-service'
import type { AzureContainer } from '../../../../src/main/types/azure-types'
import type { AzureAccess } from '../../../../src/main/types/credential-types'
import type {
  DownloadFileOptions,
  UploadFileOptions
} from '../../../../src/main/types/storage-service-types'
import type { UploadPart } from '../../../../src/main/types/transfer-queue-types'
import { blockId } from '../../../../src/main/utils/azure-utils'
import { UploadExpiredError } from '../../../../src/main/utils/error-utils'
import { makeTempDir, removeTempDir } from '../../../support/temp-dir'

const ACCESS: AzureAccess = {
  platform: 'azure',
  account: 'myaccount',
  container: 'backups',
  credentials: { platform: 'azure', accountKey: 'key' }
}
const restError = (code: string, statusCode: number): Error =>
  Object.assign(new Error(code), { name: 'RestError', code, statusCode })
const md5 = (text: string): string => createHash('md5').update(text).digest('base64')

let dir: string
let blob: {
  upload: ReturnType<typeof vi.fn>
  stageBlock: ReturnType<typeof vi.fn>
  commitBlockList: ReturnType<typeof vi.fn>
  download: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  setAccessTier: ReturnType<typeof vi.fn>
}
let container: {
  getProperties: ReturnType<typeof vi.fn>
  listBlobsByHierarchy: ReturnType<typeof vi.fn>
  getBlockBlobClient: ReturnType<typeof vi.fn>
}
const service = (): AzureBlobService =>
  new AzureBlobService(() => container as unknown as AzureContainer)

beforeEach(async () => {
  dir = await makeTempDir()
  blob = {
    upload: vi.fn(async () => ({})),
    stageBlock: vi.fn(async () => ({})),
    commitBlockList: vi.fn(async () => ({})),
    download: vi.fn(),
    delete: vi.fn(async () => ({})),
    setAccessTier: vi.fn(async () => ({}))
  }
  container = {
    getProperties: vi.fn(async () => ({})),
    listBlobsByHierarchy: vi.fn(),
    getBlockBlobClient: vi.fn(() => blob)
  }
})
afterEach(async () => {
  await removeTempDir(dir)
})

async function upload(changes: Partial<UploadFileOptions> = {}): Promise<UploadPart[]> {
  const filePath = join(dir, 'notes.txt')
  await writeFile(filePath, 'abcdefghij')
  const parts: UploadPart[] = []
  await service().uploadFile(ACCESS, {
    key: 'a/notes.txt',
    storageClass: 'Archive',
    filePath,
    fileSize: 10,
    partSize: 4,
    uploadId: null,
    parts: [],
    signal: new AbortController().signal,
    onCreated: () => undefined,
    onPart: (part) => parts.push(part),
    onProgress: () => undefined,
    ...changes
  })
  return parts
}

describe('AzureBlobService uploads', () => {
  it('sends a small file whole, in the chosen tier, with its MD5', async () => {
    await upload({ partSize: 16 })
    expect(container.getBlockBlobClient).toHaveBeenCalledWith('a/notes.txt')
    const [body, length, options] = blob.upload.mock.calls[0]
    expect(Buffer.from(body).toString()).toBe('abcdefghij')
    expect(length).toBe(10)
    expect(options).toMatchObject({ tier: 'Archive' })
    expect(Buffer.from(options.transactionalContentMD5).toString('base64')).toBe(md5('abcdefghij'))
  })

  it('sends only the blocks Azure lacks, each with its MD5, then commits them all in order', async () => {
    const parts = await upload({ parts: [{ partNumber: 1, etag: '', checksum: md5('abcd') }] })
    const staged = blob.stageBlock.mock.calls.map(([id, body]) => [
      id,
      Buffer.from(body).toString()
    ])
    expect(staged.sort()).toEqual(
      [
        [blockId(2), 'efgh'],
        [blockId(3), 'ij']
      ].sort()
    )
    expect(parts.map((part) => part.checksum).sort()).toEqual([md5('efgh'), md5('ij')].sort())
    expect(blob.commitBlockList).toHaveBeenCalledWith(
      [blockId(1), blockId(2), blockId(3)],
      expect.objectContaining({ tier: 'Archive' })
    )
  })

  it("starts over when Azure dropped the blocks, and refuses S3's storage classes", async () => {
    blob.commitBlockList.mockRejectedValueOnce(restError('InvalidBlockList', 400))
    await expect(upload()).rejects.toBeInstanceOf(UploadExpiredError)
    await expect(upload({ storageClass: 'DEEP_ARCHIVE' })).rejects.toThrow('Azure access tier')
  })
})

describe('AzureBlobService downloads', () => {
  const download = (changes: Partial<DownloadFileOptions> = {}): Promise<void> =>
    service().downloadFile(ACCESS, {
      key: 'a/notes.txt',
      targetPath: join(dir, 'notes.txt'),
      etag: null,
      bytesTotal: null,
      signal: new AbortController().signal,
      onStart: () => undefined,
      onProgress: () => undefined,
      ...changes
    })
  const answer = (text: string, etag = '"v1"'): unknown => ({
    readableStreamBody: Readable.from([Buffer.from(text)]),
    contentLength: text.length,
    etag
  })

  it('saves the blob through a .part file, naming its version and size', async () => {
    blob.download.mockResolvedValue(answer('abcdefghij'))
    const onStart = vi.fn()
    await download({ onStart })
    expect(onStart).toHaveBeenCalledWith('"v1"', 10)
    expect(await readFile(join(dir, 'notes.txt'), 'utf8')).toBe('abcdefghij')
    expect(await readdir(dir)).toEqual(['notes.txt'])
  })

  it('continues a .part file of the same version, and starts over when the blob changed', async () => {
    await writeFile(join(dir, 'notes.txt.part'), 'abcd')
    blob.download.mockResolvedValueOnce(answer('efghij'))
    await download({ etag: '"v1"', bytesTotal: 10 })
    expect(blob.download).toHaveBeenLastCalledWith(
      4,
      undefined,
      expect.objectContaining({
        conditions: { ifMatch: '"v1"' }
      })
    )
    expect(await readFile(join(dir, 'notes.txt'), 'utf8')).toBe('abcdefghij')

    await writeFile(join(dir, 'other.txt.part'), 'old!')
    blob.download
      .mockRejectedValueOnce(restError('ConditionNotMet', 412))
      .mockResolvedValueOnce(answer('NEW CONTENT', '"v2"'))
    await download({ targetPath: join(dir, 'other.txt'), etag: '"v1"', bytesTotal: 20 })
    expect(blob.download).toHaveBeenLastCalledWith(0, undefined, expect.any(Object))
    expect(await readFile(join(dir, 'other.txt'), 'utf8')).toBe('NEW CONTENT')
  })
})

describe('AzureBlobService browsing and the rest', () => {
  it('lists one page of a folder, with its folders and files', async () => {
    const page = {
      segment: {
        blobPrefixes: [{ name: 'a/b/' }],
        blobItems: [
          {
            name: 'a/x.zip',
            properties: {
              lastModified: new Date('2026-11-01T10:00:00Z'),
              contentLength: 3,
              accessTier: 'Hot'
            }
          }
        ]
      },
      continuationToken: 'next'
    }
    const byPage = vi.fn(() => ({ next: async () => ({ done: false, value: page }) }))
    container.listBlobsByHierarchy.mockReturnValue({ byPage })
    const listing = await service().listFolder(ACCESS, 'a/', null)
    expect(container.listBlobsByHierarchy).toHaveBeenCalledWith('/', {
      prefix: 'a/',
      includeMetadata: true
    })
    expect(listing).toMatchObject({
      folders: [{ id: 'a/b/', name: 'b' }],
      files: [{ key: 'a/x.zip', name: 'x.zip', storageClass: 'Hot' }],
      nextToken: 'next'
    })
  })

  it('deletes with snapshots, and rehydrates into the chosen tier at the chosen priority', async () => {
    await service().deleteFile(ACCESS, 'a.zip')
    expect(blob.delete).toHaveBeenCalledWith({ deleteSnapshots: 'include' })
    await service().restoreFile(ACCESS, 'a.zip', 'Cool', 'High')
    expect(blob.setAccessTier).toHaveBeenCalledWith('Cool', { rehydratePriority: 'High' })
  })

  it("says when the storage account can't be reached, such as a misspelled name", async () => {
    container.getProperties.mockRejectedValueOnce(restError('REQUEST_SEND_ERROR', 0))
    await expect(service().checkContainer(ACCESS)).rejects.toThrow(
      'Couldn\'t reach the storage account "myaccount"'
    )
    container.getProperties.mockRejectedValueOnce(restError('ContainerNotFound', 404))
    await expect(service().checkContainer(ACCESS)).rejects.toThrow('ContainerNotFound')
  })
})
