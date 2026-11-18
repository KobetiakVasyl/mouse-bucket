import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { GetObjectCommand, type GetObjectCommandOutput, S3Client } from '@aws-sdk/client-s3'
import { mockClient } from 'aws-sdk-client-mock'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { makeTempDir, removeTempDir } from '../testing/temp-dir'
import { downloadFile } from './download'

const s3 = mockClient(S3Client)
const client = new S3Client({
  region: 'eu-west-1',
  credentials: { accessKeyId: 'AKIAEXAMPLEKEY000001', secretAccessKey: 'secret' }
})

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

describe('downloadFile', () => {
  it('saves the object and reports progress against its size', async () => {
    s3.on(GetObjectCommand, { Bucket: 'b1', Key: 'a/notes.txt' }).resolves({
      Body: body(Readable.from([Buffer.from('hel'), Buffer.from('lo')])),
      ContentLength: 5
    })
    const targetPath = join(dir, 'notes.txt')
    const progress: [number, number][] = []
    await downloadFile({
      client,
      bucket: 'b1',
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
    const download = downloadFile({
      client,
      bucket: 'b1',
      key: 'k',
      targetPath: join(dir, 'notes.txt'),
      signal: new AbortController().signal,
      onProgress: () => undefined
    })
    await expect(download).rejects.toThrow('connection lost')
    expect(await readdir(dir)).toEqual([])
  })
})
