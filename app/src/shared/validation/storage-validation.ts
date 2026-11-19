// What the page may send to upload files, browse a template, and download, delete or restore a file, on any platform.
// See docs/ARCHITECTURE.md.
import { z } from 'zod'
import { RESTORE_DAYS } from '../constants/storage-constants'
import { TemplateIdSchema } from './template-validation'

// An S3 key, an Azure blob name or a Google Drive file ID.
const KeySchema = z.string().min(1).max(1024)

// The storage classes an S3 upload may use.
export const UploadStorageClassSchema = z.enum(['DEEP_ARCHIVE', 'STANDARD'])

// The access tiers an Azure upload may use.
export const AccessTierSchema = z.enum(['Hot', 'Cool', 'Cold', 'Archive'])

// S3's storage class or Azure's access tier; Google Drive has neither, so it sends null.
export const UploadClassSchema = z.union([UploadStorageClassSchema, AccessTierSchema]).nullable()

export const UploadRequestSchema = z
  .object({ templateId: TemplateIdSchema, storageClass: UploadClassSchema })
  .strict()

// Files and folders dropped on the page, by the paths the preload read from them.
export const UploadPathsRequestSchema = UploadRequestSchema.extend({
  paths: z.array(z.string().min(1).max(4096)).min(1).max(10_000)
}).strict()

export const FolderRequestSchema = z
  .object({
    templateId: TemplateIdSchema,
    // '' for the template's own folder; otherwise a folder from an earlier listing.
    folder: z.string().max(1024),
    // null for the first page of the folder.
    continuationToken: z.string().max(4096).nullable()
  })
  .strict()

export const DownloadRequestSchema = z
  .object({ templateId: TemplateIdSchema, key: KeySchema })
  .strict()

export const RestoreTierSchema = z.enum(['Standard', 'Bulk'])

// Azure rehydrates an archived blob into another tier, at standard or high priority.
export const RehydrateTierSchema = z.enum(['Hot', 'Cool', 'Cold'])
export const RehydratePrioritySchema = z.enum(['Standard', 'High'])

export const RestoreOptionsSchema = z.discriminatedUnion('platform', [
  z
    .object({
      platform: z.literal('s3'),
      tier: RestoreTierSchema,
      days: z
        .number()
        .int()
        .min(RESTORE_DAYS.min, `Keep it at least ${RESTORE_DAYS.min} day.`)
        .max(RESTORE_DAYS.max, `Keep it at most ${RESTORE_DAYS.max} days.`)
    })
    .strict(),
  z
    .object({
      platform: z.literal('azure'),
      tier: RehydrateTierSchema,
      priority: RehydratePrioritySchema
    })
    .strict()
])

export const RestoreRequestSchema = z
  .object({ templateId: TemplateIdSchema, key: KeySchema, options: RestoreOptionsSchema })
  .strict()

// A folder from a listing, with everything inside it at any depth: a prefix ending in "/" on S3 and Azure, or a Google
// Drive folder's ID. Never the template's own top.
const FolderIdSchema = z.string().min(1).max(1024)

export const FolderTargetRequestSchema = z
  .object({ templateId: TemplateIdSchema, folder: FolderIdSchema })
  .strict()

export const FolderRestoreRequestSchema = FolderTargetRequestSchema.extend({
  options: RestoreOptionsSchema
}).strict()
