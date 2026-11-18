// The IPC contract: what each channel accepts and returns, the result envelope, and window.api. See docs/ARCHITECTURE.md.
import type { Channel } from '../constants/ipc-constants'
import type {
  DownloadRequest,
  FolderListing,
  FolderRequest,
  RestoreRequest,
  UploadPathsRequest,
  UploadRequest
} from './storage-types'
import type { Settings, SettingsUpdate } from './settings-types'
import type { NewTemplate, Template, TemplateEdit } from './template-types'
import type { Transfer } from './transfer-types'
import type { UpdateState } from './update-types'

export type InvokeChannel = (typeof Channel)[keyof typeof Channel]

export type IpcResult<T> = { ok: true; value: T } | { ok: false; error: string }

export interface AppStatus {
  encryptionAvailable: boolean
  version: string
}

// What the renderer sends on each invoke channel.
export interface Requests {
  'app:status': undefined
  'app:copyText': string
  'settings:get': undefined
  'settings:update': SettingsUpdate
  'settings:chooseDownloadFolder': undefined
  'templates:list': undefined
  'templates:create': NewTemplate
  'templates:update': TemplateEdit
  'templates:delete': string
  'templates:cancelSignIn': undefined
  'upload:chooseFiles': UploadRequest
  'upload:chooseFolder': UploadRequest
  'upload:paths': UploadPathsRequest
  'download:list': FolderRequest
  'download:file': DownloadRequest
  'download:delete': DownloadRequest
  'download:restore': RestoreRequest
  'transfers:list': undefined
  'transfers:pause': string
  'transfers:resume': string
  'transfers:cancel': string
  'updates:status': undefined
  'updates:check': undefined
  'updates:download': undefined
  'updates:install': undefined
}

export interface Responses {
  'app:status': AppStatus
  // Main writes the text to the clipboard, which the page itself may not.
  'app:copyText': void
  'settings:get': Settings
  'settings:update': Settings
  // The settings with the chosen folder, or unchanged when the picker was cancelled.
  'settings:chooseDownloadFolder': Settings
  'templates:list': Template[]
  'templates:create': Template
  'templates:update': Template
  'templates:delete': void
  // Stops a Google sign-in that's waiting in the browser, so adding the template fails.
  'templates:cancelSignIn': void
  // How many files were queued; 0 when the dialog was cancelled.
  'upload:chooseFiles': number
  'upload:chooseFolder': number
  'upload:paths': number
  'download:list': FolderListing
  // The name the file is saved under in the download folder.
  'download:file': string
  'download:delete': void
  'download:restore': void
  'transfers:list': Transfer[]
  'transfers:pause': void
  'transfers:resume': void
  // Stops the transfer and deletes what it moved so far.
  'transfers:cancel': void
  'updates:status': UpdateState
  // The state once GitHub answered.
  'updates:check': UpdateState
  'updates:download': void
  'updates:install': void
}

// window.api, which the preload exposes to the renderer.
export interface Api {
  getStatus(): Promise<AppStatus>
  copyText(text: string): Promise<void>
  getSettings(): Promise<Settings>
  updateSettings(update: SettingsUpdate): Promise<Settings>
  chooseDownloadFolder(): Promise<Settings>
  listTemplates(): Promise<Template[]>
  createTemplate(template: NewTemplate): Promise<Template>
  updateTemplate(edit: TemplateEdit): Promise<Template>
  deleteTemplate(id: string): Promise<void>
  cancelSignIn(): Promise<void>
  chooseFilesToUpload(request: UploadRequest): Promise<number>
  chooseFolderToUpload(request: UploadRequest): Promise<number>
  // The preload reads the dropped files' paths, so the page never handles them.
  uploadDroppedFiles(request: UploadRequest, files: File[]): Promise<number>
  listFolder(request: FolderRequest): Promise<FolderListing>
  downloadFile(request: DownloadRequest): Promise<string>
  deleteFile(request: DownloadRequest): Promise<void>
  restoreFile(request: RestoreRequest): Promise<void>
  listTransfers(): Promise<Transfer[]>
  pauseTransfer(id: string): Promise<void>
  resumeTransfer(id: string): Promise<void>
  cancelTransfer(id: string): Promise<void>
  onTransfersChanged(listener: (transfers: Transfer[]) => void): () => void
  getUpdateStatus(): Promise<UpdateState>
  checkForUpdates(): Promise<UpdateState>
  downloadUpdate(): Promise<void>
  installUpdate(): Promise<void>
  onUpdateChanged(listener: (state: UpdateState) => void): () => void
}
