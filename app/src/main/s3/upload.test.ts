import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { mockClient } from 'aws-sdk-client-mock'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { makeTempDir, removeTempDir } from '../testing/temp-dir'
import { partSizeFor, uploadFile } from './upload'

const MiB = 1024 * 1024
const s3 = mockClient(S3Client)
const client = new S3Client({
  region: 'eu-west-1',
  credentials: { accessKeyId: 'AKIAEXAMPLEKEY000001', secretAccessKey: 'secret' }
})

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

describe('partSizeFor', () => {
  it('uses 8 MiB parts up to about 78 GiB', () => {
    expect(partSizeFor(0)).toBe(8 * MiB)
    expect(partSizeFor(78 * 1024 * MiB)).toBe(8 * MiB)
  })

  it('grows parts so no file needs more than 10,000', () => {
    const fiveTiB = 5 * 1024 * 1024 * MiB
    expect(Math.ceil(fiveTiB / partSizeFor(fiveTiB))).toBeLessThanOrEqual(10_000)
    expect(partSizeFor(fiveTiB) % MiB).toBe(0)
  })
})

describe('uploadFile', () => {
  it('puts a small file at its key and reports progress', async () => {
    s3.on(PutObjectCommand).resolves({ ETag: '"etag"' })
    const filePath = join(dir, 'notes.txt')
    await writeFile(filePath, 'hello')
    const progress: number[] = []
    await uploadFile({
      client,
      bucket: 'b1',
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

  it('does nothing once cancelled', async () => {
    const controller = new AbortController()
    controller.abort()
    const upload = uploadFile({
      client,
      bucket: 'b1',
      key: 'k',
      filePath: join(dir, 'missing.txt'),
      fileSize: 0,
      signal: controller.signal,
      onProgress: () => undefined
    })
    await expect(upload).rejects.toMatchObject({ name: 'AbortError' })
    expect(s3.commandCalls(PutObjectCommand)).toHaveLength(0)
  })
})
