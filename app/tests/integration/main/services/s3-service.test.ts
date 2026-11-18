import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import {
  GetObjectCommand,
  type GetObjectCommandOutput,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3'
import { mockClient } from 'aws-sdk-client-mock'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { S3Service } from '../../../../src/main/services/s3-service'
import type { BucketAccess } from '../../../../src/main/types/credential-types'
import { makeTempDir, removeTempDir } from '../../../support/temp-dir'

const s3 = mockClient(S3Client)
const service = new S3Service()
const BUCKET: BucketAccess = {
  bucket: 'b1',
  region: 'eu-west-1',
  credentials: { accessKeyId: 'AKIAEXAMPLEKEY000001', secretAccessKey: 'secret' }
}

const body = (stream: Readable): GetObjectCommandOutput['Body'] =>
  stream as unknown as GetObjectCommandOutput['Body']

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
  it('reads the file from disk, puts it at its key and reports progress', async () => {
    s3.on(PutObjectCommand).resolves({ ETag: '"etag"' })
    const filePath = join(dir, 'notes.txt')
    await writeFile(filePath, 'hello')
    const progress: number[] = []
    await service.uploadFile(BUCKET, {
      key: 'a/notes.txt',
      filePath,
      fileSize: 5,
      signal: new AbortController().signal,
      onProgress: (bytesDone) => progress.push(bytesDone)
    })
    const calls = s3.commandCalls(PutObjectCommand)
    expect(calls).toHaveLength(1)
    expect(calls[0].args[0].input).toMatchObject({
      Bucket: 'b1',
      Key: 'a/notes.txt',
      StorageClass: 'DEEP_ARCHIVE',
      ChecksumAlgorithm: 'CRC64NVME'
    })
    expect(calls[0].args[0].input).not.toHaveProperty('ServerSideEncryption')
    expect(progress[progress.length - 1]).toBe(5)
  })
})

describe('downloadFile', () => {
  it('saves the object and reports progress against its size', async () => {
    s3.on(GetObjectCommand, { Bucket: 'b1', Key: 'a/notes.txt' }).resolves({
      Body: body(Readable.from([Buffer.from('hel'), Buffer.from('lo')])),
      ContentLength: 5
    })
    const targetPath = join(dir, 'notes.txt')
    const progress: [number, number][] = []
    await service.downloadFile(BUCKET, {
      key: 'a/notes.txt',
      targetPath,
      signal: new AbortController().signal,
      onProgress: (done, total) => progress.push([done, total])
    })
    expect(await readFile(targetPath, 'utf8')).toBe('hello')
    expect(progress).toEqual([
      [0, 5],
      [3, 5],
      [5, 5]
    ])
    expect(await readdir(dir)).toEqual(['notes.txt'])
  })

  it('leaves neither a partial file nor a changed target when the stream fails', async () => {
    const failing = new Readable({
      read() {
        this.push(Buffer.from('hel'))
        this.destroy(new Error('connection lost'))
      }
    })
    s3.on(GetObjectCommand).resolves({ Body: body(failing), ContentLength: 5 })
    const download = service.downloadFile(BUCKET, {
      key: 'k',
      targetPath: join(dir, 'notes.txt'),
      signal: new AbortController().signal,
      onProgress: () => undefined
    })
    await expect(download).rejects.toThrow('connection lost')
    expect(await readdir(dir)).toEqual([])
  })
})
