// What each of the app's files in its data folder must contain to be used. See docs/ENVIRONMENTS.md.
import { isAbsolute } from 'node:path'
import { z } from 'zod'
import { UploadStorageClassSchema } from '../../shared/validation/s3-validation'
import { SettingsSchema } from '../../shared/validation/settings-validation'
import { TemplateSchema } from '../../shared/validation/template-validation'

// Settings may be partly missing; the defaults fill in the rest. A download folder must be a full path.
export const StoredSettingsSchema = SettingsSchema.partial().extend({
  downloadFolder: z
    .string()
    .refine((folder) => isAbsolute(folder))
    .optional()
})

export const TemplatesFileSchema = z.array(TemplateSchema)

export const CredentialsFileSchema = z.record(
  z.string(),
  z.object({ accessKeyId: z.string(), secretAccessKey: z.string() })
)

export const BoundsSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().positive(),
  height: z.number().int().positive()
})

export const WindowStateSchema = z.object({ bounds: BoundsSchema, maximized: z.boolean() })

const TransferBaseSchema = z.object({
  id: z.uuid(),
  templateId: z.uuid(),
  templateName: z.string(),
  bucket: z.string(),
  region: z.string(),
  key: z.string().min(1),
  name: z.string()
})

export const DownloadRecordSchema = TransferBaseSchema.extend({
  kind: z.literal('download'),
  targetPath: z.string().refine((target) => isAbsolute(target)),
  // null until the download starts and S3 names the object's version and size.
  etag: z.string().nullable(),
  bytesTotal: z.number().int().nonnegative().nullable()
})

export const UploadPartSchema = z.object({
  partNumber: z.number().int().min(1).max(10_000),
  etag: z.string(),
  checksum: z.string()
})

export const UploadRecordSchema = TransferBaseSchema.extend({
  kind: z.literal('upload'),
  storageClass: UploadStorageClassSchema,
  filePath: z.string().refine((file) => isAbsolute(file)),
  // The file's size and modification time when the upload began, to notice a file that changed.
  fileSize: z.number().int().nonnegative(),
  fileModifiedMs: z.number(),
  partSize: z.number().int().positive(),
  // null until S3 starts the multipart upload.
  uploadId: z.string().nullable(),
  parts: z.array(UploadPartSchema)
})

export const TransfersFileSchema = z.array(
  z.discriminatedUnion('kind', [DownloadRecordSchema, UploadRecordSchema])
)
