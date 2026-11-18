import { readdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import type { S3Service } from '../../../../src/main/services/s3-service'
import { TransferRunnerService } from '../../../../src/main/services/transfer-runner-service'
import type {
  DownloadRecord,
  TransferRecord,
  TransferRunContext,
  UploadRecord
} from '../../../../src/main/types/transfer-queue-types'
import { makeTempDir, removeTempDir } from '../../../support/temp-dir'

const KEYS = { accessKeyId: 'AKIAEXAMPLEKEY000001', secretAccessKey: 'secret' }
const ACCESS = { bucket: 'bucket-one', region: 'eu-west-1', credentials: KEYS }
const BASE = {
  id: '11111111-2222-4333-8444-555555555555',
  templateId: '7d1c3f5e-1b2a-4c3d-8e9f-0a1b2c3d4e5f',
  templateName: 'Reports',
  bucket: 'bucket-one',
  region: 'eu-west-1',
  key: 'a/notes.txt',
  name: 'notes.txt'
}

let dir: string
let saved: TransferRecord[]
let s3: {
  downloadFile: Mock<S3Service['downloadFile']>
  uploadFile: Mock<S3Service['uploadFile']>
  abortUpload: Mock<S3Service['abortUpload']>
}
const runner = (): TransferRunnerService =>
  new TransferRunnerService(s3, { credentialsFor: async () => KEYS })
const context = (): TransferRunContext => ({
  signal: new AbortController().signal,
  progress: () => undefined,
  save: (record) => saved.push(record)
})

async function uploadRecord(changes: Partial<UploadRecord> = {}): Promise<UploadRecord> {
  const filePath = join(dir, 'notes.txt')
  await writeFile(filePath, 'abcdefghij')
  const info = await stat(filePath)
  return {
    ...BASE,
    kind: 'upload',
    storageClass: 'DEEP_ARCHIVE',
    filePath,
    fileSize: info.size,
    fileModifiedMs: info.mtimeMs,
    partSize: 4,
    uploadId: 'upload-1',
    parts: [{ partNumber: 1, etag: '"etag-1"', checksum: 'crc-1' }],
    ...changes
  }
}

const downloadRecord = (etag: string | null): DownloadRecord => ({
  ...BASE,
  kind: 'download',
  targetPath: join(dir, 'notes.txt'),
  etag,
  bytesTotal: etag === null ? null : 10
})

beforeEach(async () => {
  dir = await makeTempDir()
  saved = []
  s3 = {
    downloadFile: vi.fn<S3Service['downloadFile']>(async () => undefined),
    uploadFile: vi.fn<S3Service['uploadFile']>(async () => undefined),
    abortUpload: vi.fn<S3Service['abortUpload']>(async () => undefined)
  }
})
afterEach(async () => {
  await removeTempDir(dir)
})

describe('TransferRunnerService', () => {
  it('continues a download from its saved version, and saves what S3 names', async () => {
    s3.downloadFile.mockImplementation(async (_access, options) => {
      options.onStart('"v1"', 10)
    })
    await runner().run(downloadRecord(null), context())
    expect(s3.downloadFile.mock.calls[0][0]).toEqual(ACCESS)
    expect(s3.downloadFile.mock.calls[0][1]).toMatchObject({ etag: null, bytesTotal: null })
    expect(saved).toMatchObject([{ etag: '"v1"', bytesTotal: 10 }])
  })

  it('counts a download’s bytes from its .part file, and deletes it when cancelled', async () => {
    const record = downloadRecord('"v1"')
    await writeFile(`${record.targetPath}.part`, 'abc')
    expect(await runner().bytesDone(record)).toBe(3)
    expect(await runner().bytesDone(downloadRecord(null))).toBe(0)
    await runner().discard(record)
    expect(await readdir(dir)).toEqual([])
  })

  it('continues an upload with its multipart upload and parts, saving each new one', async () => {
    const record = await uploadRecord()
    s3.uploadFile.mockImplementation(async (_access, options) => {
      options.onPart({ partNumber: 2, etag: '"etag-2"', checksum: 'crc-2' })
    })
    await runner().run(record, context())
    expect(s3.uploadFile.mock.calls[0][1]).toMatchObject({
      uploadId: 'upload-1',
      parts: record.parts,
      partSize: 4
    })
    expect(saved.at(-1)?.kind === 'upload' && saved.at(-1)).toMatchObject({
      parts: [{ partNumber: 1 }, { partNumber: 2 }]
    })
    expect(await runner().bytesDone(record)).toBe(4)
  })

  it('starts an upload over when the file changed, after stopping the old one', async () => {
    const record = { ...(await uploadRecord()), fileSize: 99 }
    await runner().run(record, context())
    expect(s3.abortUpload).toHaveBeenCalledWith(ACCESS, 'a/notes.txt', 'upload-1')
    expect(s3.uploadFile.mock.calls[0][1]).toMatchObject({
      uploadId: null,
      parts: [],
      fileSize: 10
    })
  })

  it('starts an upload over once when S3 no longer knows it', async () => {
    const record = await uploadRecord()
    s3.uploadFile.mockRejectedValueOnce(Object.assign(new Error('gone'), { name: 'NoSuchUpload' }))
    await runner().run(record, context())
    expect(s3.uploadFile).toHaveBeenCalledTimes(2)
    expect(s3.uploadFile.mock.calls[1][1]).toMatchObject({ uploadId: null, parts: [] })
  })

  it('stops a cancelled upload’s multipart upload, and does nothing before one started', async () => {
    await runner().discard(await uploadRecord())
    await runner().discard(await uploadRecord({ uploadId: null, parts: [] }))
    expect(s3.abortUpload).toHaveBeenCalledTimes(1)
    expect(s3.abortUpload).toHaveBeenCalledWith(ACCESS, 'a/notes.txt', 'upload-1')
  })
})
