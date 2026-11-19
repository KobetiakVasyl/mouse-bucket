// What every platform's service does, and what one upload or download needs apart from where it goes, including where an
// earlier run stopped. See docs/ARCHITECTURE.md.
import type { FolderListing, StoredFile, UploadClass } from '../../shared/types/storage-types'
import type {
  AzureTemplate,
  DriveTemplate,
  S3Template,
  TemplateKind
} from '../../shared/types/template-types'
import type { UploadPart } from './transfer-queue-types'

type TemplateOwn = 'id' | 'name' | 'kind'

// What a template holds about where it points, on each platform.
export type TemplateTarget =
  | Omit<S3Template, TemplateOwn>
  | Omit<AzureTemplate, TemplateOwn>
  | Omit<DriveTemplate, TemplateOwn>

// A template apart from its ID.
export type TemplateDetails = { name: string; kind: TemplateKind } & TemplateTarget

export interface UploadFileOptions {
  // Where the file goes: an S3 key, an Azure blob name, or a path inside the Google Drive folder.
  key: string
  storageClass: UploadClass
  filePath: string
  fileSize: number
  partSize: number
  // null for a new upload; otherwise the platform's handle on the one to continue, and the parts it already has.
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

// A file somewhere inside a folder, with its path below that folder, such as "2025/beach.jpg".
export type TreeFile = StoredFile & { path: string }

// One platform's files: browsing, sending and fetching them from where they stopped, and deleting them, one by one or
// a whole folder at a time. Restores differ by platform, so each service has its own.
export interface PlatformStorage<A> {
  listFolder(access: A, folder: string, continuationToken: string | null): Promise<FolderListing>
  uploadFile(access: A, options: UploadFileOptions): Promise<void>
  // Throws away an unfinished upload, so the platform stops keeping what it received.
  abortUpload(access: A, key: string, uploadId: string): Promise<void>
  downloadFile(access: A, options: DownloadFileOptions): Promise<void>
  deleteFile(access: A, key: string): Promise<void>
  // The name a download is saved under, before it's made safe for this computer.
  fileName(access: A, key: string): Promise<string>
  // Every file inside a folder from a listing, at any depth.
  folderFiles(access: A, folder: string): Promise<TreeFile[]>
  // The folder's own name, for the folder a download goes into.
  folderName(access: A, folder: string): Promise<string>
  // Removes the folder with everything inside it.
  deleteFolder(access: A, folder: string): Promise<void>
}
