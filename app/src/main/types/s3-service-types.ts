// What one upload or download needs apart from the bucket, and a listed object with the fields a file needs. See docs/ARCHITECTURE.md.
import type { _Object } from '@aws-sdk/client-s3'

export interface UploadFileOptions {
  key: string
  filePath: string
  fileSize: number
  signal: AbortSignal
  onProgress: (bytesDone: number) => void
}

export interface DownloadFileOptions {
  key: string
  targetPath: string
  signal: AbortSignal
  onProgress: (bytesDone: number, bytesTotal: number) => void
}

export type ListedObject = _Object & { Key: string; Size: number; LastModified: Date }
