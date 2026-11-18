// What one upload or download needs apart from the bucket, including where an earlier run stopped, and a listed
// object with the fields a file needs. See docs/ARCHITECTURE.md.
import type { _Object } from '@aws-sdk/client-s3'
import type { UploadStorageClass } from '../../shared/types/s3-types'
import type { UploadPart } from './transfer-queue-types'

export interface UploadFileOptions {
  key: string
  storageClass: UploadStorageClass
  filePath: string
  fileSize: number
  partSize: number
  // null for a new upload; otherwise the multipart upload to continue, and the parts S3 already has.
  uploadId: string | null
  parts: UploadPart[]
  signal: AbortSignal
  onCreated: (uploadId: string) => void
  onPart: (part: UploadPart) => void
  onProgress: (bytesDone: number) => void
}

export interface DownloadFileOptions {
  key: string
  targetPath: string
  // null for a new download; otherwise the version a .part file left by an earlier run came from, and its size.
  etag: string | null
  bytesTotal: number | null
  signal: AbortSignal
  onStart: (etag: string, bytesTotal: number) => void
  onProgress: (bytesDone: number, bytesTotal: number) => void
}

export type ListedObject = _Object & { Key: string; Size: number; LastModified: Date }
