// What each of the app's files in its data folder must contain to be used. See docs/ENVIRONMENTS.md.
import { isAbsolute } from 'node:path'
import { z } from 'zod'
import { SettingsSchema } from '../../shared/validation/settings-validation'
import { UploadClassSchema } from '../../shared/validation/storage-validation'
import { TemplateSchema, withS3Platform } from '../../shared/validation/template-validation'

// Settings may be partly missing; the defaults fill in the rest. A download folder must be a full path.
export const StoredSettingsSchema = SettingsSchema.partial().extend({
  downloadFolder: z
    .string()
    .refine((folder) => isAbsolute(folder))
    .optional()
})

export const TemplatesFileSchema = z.array(TemplateSchema)

export const S3CredentialsSchema = z.object({
  platform: z.literal('s3'),
  accessKeyId: z.string(),
  secretAccessKey: z.string()
})

export const AzureCredentialsSchema = z.object({
  platform: z.literal('azure'),
  accountKey: z.string()
})

export const DriveCredentialsSchema = z.object({
  platform: z.literal('google-drive'),
  clientId: z.string(),
  clientSecret: z.string(),
  refreshToken: z.string()
})

export const CredentialsSchema = z.preprocess(
  withS3Platform,
  z.discriminatedUnion('platform', [
    S3CredentialsSchema,
    AzureCredentialsSchema,
    DriveCredentialsSchema
  ])
)

export const CredentialsFileSchema = z.record(z.string(), CredentialsSchema)

export const BoundsSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().positive(),
  height: z.number().int().positive()
})

export const WindowStateSchema = z.object({ bounds: BoundsSchema, maximized: z.boolean() })

export const TransferPlaceSchema = z.discriminatedUnion('platform', [
  z.object({ platform: z.literal('s3'), bucket: z.string(), region: z.string() }),
  z.object({ platform: z.literal('azure'), account: z.string(), container: z.string() }),
  // The template's own folder, under which every file the transfer touches lies.
  z.object({ platform: z.literal('google-drive'), folderId: z.string() })
])

// A transfer saved with only a bucket and region, from before other platforms, went to S3.
function withPlace(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || Object.hasOwn(raw, 'place')) return raw
  const bucket: unknown = Reflect.get(raw, 'bucket')
  const region: unknown = Reflect.get(raw, 'region')
  return { ...raw, place: { platform: 's3', bucket, region } }
}

const TransferBaseSchema = z.object({
  id: z.uuid(),
  templateId: z.uuid(),
  templateName: z.string(),
  place: TransferPlaceSchema,
  // An S3 key or Azure blob name; on Google Drive, a download's file ID, or an upload's path inside the folder.
  key: z.string().min(1),
  name: z.string()
})

export const DownloadRecordSchema = TransferBaseSchema.extend({
  kind: z.literal('download'),
  targetPath: z.string().refine((target) => isAbsolute(target)),
  // null until the download starts and the platform names the file's version and size.
  etag: z.string().nullable(),
  bytesTotal: z.number().int().nonnegative().nullable()
})

// A part the platform confirmed: S3's with its ETag and checksum, an Azure block with its MD5, or a chunk Google Drive
// received. Platforms that don't name a field leave it empty.
export const UploadPartSchema = z.object({
  partNumber: z.number().int().min(1).max(10_000),
  etag: z.string(),
  checksum: z.string()
})

export const UploadRecordSchema = TransferBaseSchema.extend({
  kind: z.literal('upload'),
  storageClass: UploadClassSchema,
  filePath: z.string().refine((file) => isAbsolute(file)),
  // The file's size and modification time when the upload began, to notice a file that changed.
  fileSize: z.number().int().nonnegative(),
  fileModifiedMs: z.number(),
  partSize: z.number().int().positive(),
  // The platform's handle on the unfinished upload: S3's multipart upload ID or Google Drive's resumable session URL.
  // null until it starts, and always for Azure, whose blocks need none.
  uploadId: z.string().nullable(),
  parts: z.array(UploadPartSchema)
})

export const TransfersFileSchema = z.array(
  z.preprocess(withPlace, z.discriminatedUnion('kind', [DownloadRecordSchema, UploadRecordSchema]))
)
