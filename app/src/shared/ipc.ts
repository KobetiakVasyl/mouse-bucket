// The IPC contract: what each channel accepts, checked in main with zod, and what it returns. See docs/ARCHITECTURE.md.
import { z } from 'zod'
import { Channel, type InvokeChannel } from './channels'

export const Theme = z.enum(['dark', 'light'])
export type Theme = z.infer<typeof Theme>

export const Settings = z.object({ theme: Theme, welcomeSeen: z.boolean() })
export type Settings = z.infer<typeof Settings>

export const SettingsUpdate = Settings.partial().strict()
export type SettingsUpdate = z.infer<typeof SettingsUpdate>

export const TemplateKind = z.enum(['upload', 'download'])
export type TemplateKind = z.infer<typeof TemplateKind>

export const Template = z.object({
  id: z.uuid(),
  name: z.string(),
  kind: TemplateKind,
  bucket: z.string(),
  prefix: z.string(),
  region: z.string()
})
export type Template = z.infer<typeof Template>

const TemplateId = z.uuid()

// A new template's keys: typed in, or copied by main from another template, so they never reach the page.
export const TemplateKeys = z.discriminatedUnion('source', [
  z
    .object({
      source: z.literal('entered'),
      accessKeyId: z
        .string()
        .trim()
        .regex(/^[A-Z0-9]{16,128}$/, "That doesn't look like an access key ID."),
      secretAccessKey: z.string().trim().min(1, 'Enter the secret access key.').max(256)
    })
    .strict(),
  z.object({ source: z.literal('copied'), templateId: TemplateId }).strict()
])
export type TemplateKeys = z.infer<typeof TemplateKeys>

export const NewTemplate = z
  .object({
    name: z.string().trim().min(1, 'Enter a name.').max(100, 'Use at most 100 characters.'),
    kind: TemplateKind,
    location: z.string().trim().min(1, 'Enter the S3 location.').max(1100),
    keys: TemplateKeys
  })
  .strict()
export type NewTemplate = z.infer<typeof NewTemplate>

export const FolderRequest = z
  .object({
    templateId: TemplateId,
    prefix: z.string().max(1024),
    // null for the first page of the folder.
    continuationToken: z.string().max(4096).nullable()
  })
  .strict()
export type FolderRequest = z.infer<typeof FolderRequest>

// Whether a file can be downloaded now. Archived files need a restore first.
export type FileAccess =
  | { state: 'available' }
  | { state: 'archived' }
  | { state: 'restoring' }
  | { state: 'restored'; until: string }

export interface S3File {
  key: string
  name: string
  size: number
  lastModified: string
  // S3's name for it, such as DEEP_ARCHIVE.
  storageClass: string
  access: FileAccess
}

export interface FolderListing {
  folders: string[]
  files: S3File[]
  // null when this is the folder's last page.
  nextToken: string | null
}

export const DownloadRequest = z
  .object({ templateId: TemplateId, key: z.string().min(1).max(1024) })
  .strict()
export type DownloadRequest = z.infer<typeof DownloadRequest>

export const RestoreTier = z.enum(['Standard', 'Bulk'])
export type RestoreTier = z.infer<typeof RestoreTier>

export const RestoreRequest = z
  .object({
    templateId: TemplateId,
    key: z.string().min(1).max(1024),
    tier: RestoreTier,
    days: z.number().int().min(1, 'Keep it at least 1 day.').max(365, 'Keep it at most 365 days.')
  })
  .strict()
export type RestoreRequest = z.infer<typeof RestoreRequest>

export interface TransferDetails {
  kind: TemplateKind
  templateName: string
  name: string
  // 0 until the size is known, as for a download before S3 answers.
  bytesTotal: number
}

interface TransferProgress extends TransferDetails {
  id: string
  bytesDone: number
}

// Only a failed transfer has an error message.
export type Transfer =
  | (TransferProgress & { status: 'queued' | 'running' | 'done' | 'cancelled' })
  | (TransferProgress & { status: 'failed'; error: string })

export type TransferStatus = Transfer['status']

export interface AppStatus {
  encryptionAvailable: boolean
}

const None = z.undefined()

// What the renderer sends on each invoke channel.
export interface Requests {
  [Channel.appStatus]: undefined
  [Channel.settingsGet]: undefined
  [Channel.settingsUpdate]: SettingsUpdate
  [Channel.templatesList]: undefined
  [Channel.templatesCreate]: NewTemplate
  [Channel.templatesDelete]: string
  [Channel.uploadChooseFiles]: string
  [Channel.downloadList]: FolderRequest
  [Channel.downloadFile]: DownloadRequest
  [Channel.downloadDelete]: DownloadRequest
  [Channel.downloadRestore]: RestoreRequest
  [Channel.transfersList]: undefined
  [Channel.transfersCancel]: string
}

// The schema main checks each payload against before handling it.
export const requests: { [C in InvokeChannel]: z.ZodType<Requests[C]> } = {
  [Channel.appStatus]: None,
  [Channel.settingsGet]: None,
  [Channel.settingsUpdate]: SettingsUpdate,
  [Channel.templatesList]: None,
  [Channel.templatesCreate]: NewTemplate,
  [Channel.templatesDelete]: TemplateId,
  [Channel.uploadChooseFiles]: TemplateId,
  [Channel.downloadList]: FolderRequest,
  [Channel.downloadFile]: DownloadRequest,
  [Channel.downloadDelete]: DownloadRequest,
  [Channel.downloadRestore]: RestoreRequest,
  [Channel.transfersList]: None,
  [Channel.transfersCancel]: z.string().min(1).max(100)
}

export interface Responses {
  [Channel.appStatus]: AppStatus
  [Channel.settingsGet]: Settings
  [Channel.settingsUpdate]: Settings
  [Channel.templatesList]: Template[]
  [Channel.templatesCreate]: Template
  [Channel.templatesDelete]: void
  // How many files were queued; 0 when the dialog was cancelled.
  [Channel.uploadChooseFiles]: number
  [Channel.downloadList]: FolderListing
  // Whether a download was queued; false when the dialog was cancelled.
  [Channel.downloadFile]: boolean
  [Channel.downloadDelete]: void
  [Channel.downloadRestore]: void
  [Channel.transfersList]: Transfer[]
  [Channel.transfersCancel]: void
}

// window.api, which the preload exposes to the renderer.
export interface Api {
  getStatus(): Promise<AppStatus>
  getSettings(): Promise<Settings>
  updateSettings(update: SettingsUpdate): Promise<Settings>
  listTemplates(): Promise<Template[]>
  createTemplate(template: NewTemplate): Promise<Template>
  deleteTemplate(id: string): Promise<void>
  chooseFilesToUpload(templateId: string): Promise<number>
  listFolder(request: FolderRequest): Promise<FolderListing>
  downloadFile(request: DownloadRequest): Promise<boolean>
  deleteFile(request: DownloadRequest): Promise<void>
  restoreFile(request: RestoreRequest): Promise<void>
  listTransfers(): Promise<Transfer[]>
  cancelTransfer(id: string): Promise<void>
  onTransfersChanged(listener: (transfers: Transfer[]) => void): () => void
}
