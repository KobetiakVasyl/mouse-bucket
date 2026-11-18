// Downloads one S3 object into a .part file that replaces the chosen file only once complete. See docs/ARCHITECTURE.md.
import { createWriteStream } from 'node:fs'
import { rename, rm } from 'node:fs/promises'
import { Readable, Transform, type TransformCallback } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { GetObjectCommand, type S3Client } from '@aws-sdk/client-s3'

export interface DownloadOptions {
  client: S3Client
  bucket: string
  key: string
  targetPath: string
  signal: AbortSignal
  onProgress: (bytesDone: number, bytesTotal: number) => void
}

export async function downloadFile(options: DownloadOptions): Promise<void> {
  const { client, bucket, key, targetPath, signal, onProgress } = options
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }), {
    abortSignal: signal
  })
  const body = response.Body
  const bytesTotal = response.ContentLength
  if (!(body instanceof Readable)) throw new Error('S3 returned no file content.')
  if (bytesTotal === undefined) throw new Error("S3 didn't say how large the file is.")

  let bytesDone = 0
  onProgress(0, bytesTotal)
  const counter = new Transform({
    transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
      bytesDone += chunk.length
      onProgress(bytesDone, bytesTotal)
      callback(null, chunk)
    }
  })

  const partPath = `${targetPath}.part`
  try {
    await pipeline(body, counter, createWriteStream(partPath), { signal })
    await rename(partPath, targetPath)
  } catch (error) {
    await rm(partPath, { force: true })
    throw error
  }
}
