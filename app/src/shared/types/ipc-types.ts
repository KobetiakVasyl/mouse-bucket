// The IPC contract: what each channel accepts and returns, the result envelope, and window.api. See docs/ARCHITECTURE.md.
import type { Channel } from '../constants/ipc-constants'
import type {
  DownloadRequest,
  FolderListing,
  FolderRequest,
  RestoreRequest,
  UploadRequest
} from './s3-types'
import type { Settings, SettingsUpdate } from './settings-types'
import type { NewTemplate, Template } from './template-types'
import type { Transfer } from './transfer-types'

export type InvokeChannel = (typeof Channel)[keyof typeof Channel]

export type IpcResult<T> = { ok: true; value: T } | { ok: false; error: string }

export interface AppStatus {
  encryptionAvailable: boolean
}

// What the renderer sends on each invoke channel.
export interface Requests {
  'app:status': undefined
  'settings:get': undefined
  'settings:update': SettingsUpdate
  'settings:chooseDownloadFolder': undefined
  'templates:list': undefined
  'templates:create': NewTemplate
  'templates:delete': string
  'upload:chooseFiles': UploadRequest
  'download:list': FolderRequest
  'download:file': DownloadRequest
  'download:delete': DownloadRequest
  'download:restore': RestoreRequest
  'transfers:list': undefined
  'transfers:cancel': string
}

export interface Responses {
  'app:status': AppStatus
  'settings:get': Settings
  'settings:update': Settings
  // The settings with the chosen folder, or unchanged when the picker was cancelled.
  'settings:chooseDownloadFolder': Settings
  'templates:list': Template[]
  'templates:create': Template
  'templates:delete': void
  // How many files were queued; 0 when the dialog was cancelled.
  'upload:chooseFiles': number
  'download:list': FolderListing
  // The name the file is saved under in the download folder.
  'download:file': string
  'download:delete': void
  'download:restore': void
  'transfers:list': Transfer[]
  'transfers:cancel': void
}

// window.api, which the preload exposes to the renderer.
export interface Api {
  getStatus(): Promise<AppStatus>
  getSettings(): Promise<Settings>
  updateSettings(update: SettingsUpdate): Promise<Settings>
  chooseDownloadFolder(): Promise<Settings>
  listTemplates(): Promise<Template[]>
  createTemplate(template: NewTemplate): Promise<Template>
  deleteTemplate(id: string): Promise<void>
  chooseFilesToUpload(request: UploadRequest): Promise<number>
  listFolder(request: FolderRequest): Promise<FolderListing>
  downloadFile(request: DownloadRequest): Promise<string>
  deleteFile(request: DownloadRequest): Promise<void>
  restoreFile(request: RestoreRequest): Promise<void>
  listTransfers(): Promise<Transfer[]>
  cancelTransfer(id: string): Promise<void>
  onTransfersChanged(listener: (transfers: Transfer[]) => void): () => void
}
