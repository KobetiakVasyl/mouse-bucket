import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  GetObjectCommand,
  type GetObjectCommandOutput,
  PutObjectCommand,
  S3Client,
  UploadPartCommand
} from '@aws-sdk/client-s3'
import { mockClient } from 'aws-sdk-client-mock'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { S3Service } from '../../../../src/main/services/s3-service'
import type { BucketAccess } from '../../../../src/main/types/credential-types'
import type {
  DownloadFileOptions,
  UploadFileOptions
} from '../../../../src/main/types/s3-service-types'
import type { UploadPart } from '../../../../src/main/types/transfer-queue-types'
import { makeTempDir, removeTempDir } from '../../../support/temp-dir'

const s3 = mockClient(S3Client)
const service = new S3Service()
const BUCKET: BucketAccess = {
  bucket: 'bucket-one',
  region: 'eu-west-1',
  credentials: { accessKeyId: 'AKIAEXAMPLEKEY000001', secretAccessKey: 'secret' }
}

const body = (stream: Readable): GetObjectCommandOutput['Body'] =>
  stream as unknown as GetObjectCommandOutput['Body']
const s3Error = (name: string, status: number): Error =>
  Object.assign(new Error(name), { name, $metadata: { httpStatusCode: status } })

let dir: string
beforeEach(async () => {
  s3.reset()
  dir = await makeTempDir()
})
afterEach(async () => {
  await removeTempDir(dir)
})
afterAll(() => {
  s3.restore()
})

describe('uploadFile', () => {
  let created: string[]
  let parts: UploadPart[]
  let progress: number[]
  const upload = (options: Partial<UploadFileOptions>): Promise<void> =>
    service.uploadFile(BUCKET, {
      key: 'a/notes.txt',
      storageClass: 'DEEP_ARCHIVE',
      filePath: join(dir, 'notes.txt'),
      fileSize: 10,
      partSize: 4,
      uploadId: null,
      parts: [],
      signal: new AbortController().signal,
      onCreated: (uploadId) => created.push(uploadId),
      onPart: (part) => parts.push(part),
      onProgress: (bytesDone) => progress.push(bytesDone),
      ...options
    })

  beforeEach(async () => {
    created = []
    parts = []
    progress = []
    await writeFile(join(dir, 'notes.txt'), 'abcdefghij')
    s3.on(CreateMultipartUploadCommand).resolves({ UploadId: 'upload-1' })
    s3.on(UploadPartCommand).callsFake((input: { PartNumber: number }) => ({
      ETag: `"etag-${input.PartNumber}"`,
      ChecksumCRC64NVME: `crc-${input.PartNumber}`
    }))
    s3.on(CompleteMultipartUploadCommand).resolves({})
  })

  it('puts a file that fits in one part in its storage class, with a checksum', async () => {
    s3.on(PutObjectCommand).resolves({ ETag: '"etag"' })
    await upload({ partSize: 16 })
    const calls = s3.commandCalls(PutObjectCommand)
    expect(calls).toHaveLength(1)
    expect(calls[0].args[0].input).toMatchObject({
      Bucket: 'bucket-one',
      Key: 'a/notes.txt',
      StorageClass: 'DEEP_ARCHIVE',
      ChecksumAlgorithm: 'CRC64NVME'
    })
    expect(calls[0].args[0].input).not.toHaveProperty('ServerSideEncryption')
    expect(progress).toEqual([10])
  })

  it('sends a larger file in parts, reporting each, and completes with their checksums', async () => {
    await upload({ storageClass: 'STANDARD' })
    expect(s3.commandCalls(CreateMultipartUploadCommand)[0].args[0].input).toMatchObject({
      StorageClass: 'STANDARD',
      ChecksumAlgorithm: 'CRC64NVME'
    })
    expect(created).toEqual(['upload-1'])
    // Parts go up a few at a time, so they may arrive in any order.
    const sent = s3
      .commandCalls(UploadPartCommand)
      .map((call) => [call.args[0].input.PartNumber, String(call.args[0].input.Body)])
      .sort()
    expect(sent).toEqual([
      [1, 'abcd'],
      [2, 'efgh'],
      [3, 'ij']
    ])
    expect(parts.map((part) => part.partNumber).sort()).toEqual([1, 2, 3])
    expect(
      s3.commandCalls(CompleteMultipartUploadCommand)[0].args[0].input.MultipartUpload
    ).toEqual({
      Parts: [1, 2, 3].map((partNumber) => ({
        PartNumber: partNumber,
        ETag: `"etag-${partNumber}"`,
        ChecksumCRC64NVME: `crc-${partNumber}`
      }))
    })
    expect(progress.at(-1)).toBe(10)
  })

  it('continues an earlier upload, sending only the parts S3 lacks', async () => {
    const first: UploadPart = { partNumber: 1, etag: '"etag-1"', checksum: 'crc-1' }
    await upload({ uploadId: 'upload-1', parts: [first] })
    expect(s3.commandCalls(CreateMultipartUploadCommand)).toHaveLength(0)
    expect(created).toEqual([])
    const sent = s3.commandCalls(UploadPartCommand).map((call) => call.args[0].input.PartNumber)
    expect(sent.sort()).toEqual([2, 3])
    expect(progress[0]).toBe(4)
    const completed = s3.commandCalls(CompleteMultipartUploadCommand)[0].args[0].input
    expect(completed.MultipartUpload?.Parts?.map((part) => part.PartNumber)).toEqual([1, 2, 3])
  })
})

describe('downloadFile', () => {
  let started: [string, number][]
  let progress: [number, number][]
  const target = (): string => join(dir, 'notes.txt')
  const download = (options: Partial<DownloadFileOptions>): Promise<void> =>
    service.downloadFile(BUCKET, {
      key: 'a/notes.txt',
      targetPath: target(),
      etag: null,
      bytesTotal: null,
      signal: new AbortController().signal,
      onStart: (etag, bytesTotal) => started.push([etag, bytesTotal]),
      onProgress: (done, total) => progress.push([done, total]),
      ...options
    })

  beforeEach(() => {
    started = []
    progress = []
  })

  it('saves the object and reports its version, its size and the progress', async () => {
    s3.on(GetObjectCommand, { Bucket: 'bucket-one', Key: 'a/notes.txt' }).resolves({
      Body: body(Readable.from([Buffer.from('hel'), Buffer.from('lo')])),
      ContentLength: 5,
      ETag: '"v1"'
    })
    await download({})
    expect(await readFile(target(), 'utf8')).toBe('hello')
    expect(started).toEqual([['"v1"', 5]])
    expect(progress).toEqual([
      [0, 5],
      [3, 5],
      [5, 5]
    ])
    expect(await readdir(dir)).toEqual(['notes.txt'])
  })

  it('continues a .part file with a range request for the same version', async () => {
    await writeFile(`${target()}.part`, 'hel')
    s3.on(GetObjectCommand).resolves({
      Body: body(Readable.from([Buffer.from('lo')])),
      ContentLength: 2,
      ETag: '"v1"'
    })
    await download({ etag: '"v1"', bytesTotal: 5 })
    expect(s3.commandCalls(GetObjectCommand)[0].args[0].input).toMatchObject({
      Range: 'bytes=3-',
      IfMatch: '"v1"'
    })
    expect(await readFile(target(), 'utf8')).toBe('hello')
    expect(progress[0]).toEqual([3, 5])
  })

  it('starts over when the object changed since the download began', async () => {
    await writeFile(`${target()}.part`, 'hel')
    s3.on(GetObjectCommand, { IfMatch: '"v1"' }).rejects(s3Error('PreconditionFailed', 412))
    s3.on(GetObjectCommand, { Key: 'a/notes.txt', Range: undefined }).resolves({
      Body: body(Readable.from([Buffer.from('world')])),
      ContentLength: 5,
      ETag: '"v2"'
    })
    await download({ etag: '"v1"', bytesTotal: 5 })
    expect(await readFile(target(), 'utf8')).toBe('world')
    expect(started).toEqual([['"v2"', 5]])
  })

  it('keeps what arrived in the .part file when the stream fails, and leaves no target', async () => {
    // The connection drops a moment after the first bytes arrive, as a real one would.
    let sent = false
    const failing = new Readable({
      read() {
        if (sent) return
        sent = true
        this.push(Buffer.from('hel'))
        setTimeout(() => this.destroy(new Error('connection lost')), 50)
      }
    })
    s3.on(GetObjectCommand).resolves({ Body: body(failing), ContentLength: 5, ETag: '"v1"' })
    await expect(download({})).rejects.toThrow('connection lost')
    expect(await readdir(dir)).toEqual(['notes.txt.part'])
    expect(await readFile(`${target()}.part`, 'utf8')).toBe('hel')
  })
})
