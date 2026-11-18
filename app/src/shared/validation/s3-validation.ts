// What the page may send to upload files, browse a bucket, and download, delete or restore a file. See docs/ARCHITECTURE.md.
import { z } from 'zod'
import { RESTORE_DAYS } from '../constants/storage-constants'
import { TemplateIdSchema } from './template-validation'

const KeySchema = z.string().min(1).max(1024)

// The storage classes an upload may use.
export const UploadStorageClassSchema = z.enum(['DEEP_ARCHIVE', 'STANDARD'])

export const UploadRequestSchema = z
  .object({ templateId: TemplateIdSchema, storageClass: UploadStorageClassSchema })
  .strict()

export const FolderRequestSchema = z
  .object({
    templateId: TemplateIdSchema,
    prefix: z.string().max(1024),
    // null for the first page of the folder.
    continuationToken: z.string().max(4096).nullable()
  })
  .strict()

export const DownloadRequestSchema = z
  .object({ templateId: TemplateIdSchema, key: KeySchema })
  .strict()

export const RestoreTierSchema = z.enum(['Standard', 'Bulk'])

export const RestoreRequestSchema = z
  .object({
    templateId: TemplateIdSchema,
    key: KeySchema,
    tier: RestoreTierSchema,
    days: z
      .number()
      .int()
      .min(RESTORE_DAYS.min, `Keep it at least ${RESTORE_DAYS.min} day.`)
      .max(RESTORE_DAYS.max, `Keep it at most ${RESTORE_DAYS.max} days.`)
  })
  .strict()
