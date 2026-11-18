// Uploads one local file to S3 as Glacier Deep Archive with a CRC64NVME checksum, in parts for large files. See docs/ARCHITECTURE.md.
import { createReadStream } from 'node:fs'
import type { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { UPLOAD_CHECKSUM, UPLOAD_STORAGE_CLASS } from '../../shared/storage'

const MiB = 1024 * 1024
const MIN_PART_SIZE = 8 * MiB
const MAX_PARTS = 10_000

// 8 MiB parts, larger for files over about 78 GiB, so no upload needs more than S3's 10,000 parts.
export function partSizeFor(fileSize: number): number {
  return Math.max(MIN_PART_SIZE, Math.ceil(fileSize / MAX_PARTS / MiB) * MiB)
}

export interface UploadOptions {
  client: S3Client
  bucket: string
  key: string
  filePath: string
  fileSize: number
  signal: AbortSignal
  onProgress: (bytesDone: number) => void
}

export async function uploadFile(options: UploadOptions): Promise<void> {
  const { client, bucket, key, filePath, fileSize, signal, onProgress } = options
  signal.throwIfAborted()
  const body = createReadStream(filePath)
  const upload = new Upload({
    client,
    // No encryption header, so the bucket's default encryption applies.
    params: {
      Bucket: bucket,
      Key: key,
      Body: body,
      StorageClass: UPLOAD_STORAGE_CLASS,
      ChecksumAlgorithm: UPLOAD_CHECKSUM
    },
    partSize: partSizeFor(fileSize),
    queueSize: 4,
    leavePartsOnError: false
  })
  upload.on('httpUploadProgress', (progress) => {
    if (progress.loaded !== undefined) onProgress(progress.loaded)
  })
  const abort = (): void => {
    void upload.abort()
  }
  signal.addEventListener('abort', abort, { once: true })
  try {
    await upload.done()
  } finally {
    signal.removeEventListener('abort', abort)
    body.destroy()
  }
}
