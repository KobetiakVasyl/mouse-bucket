// What a template is on each platform, and what the page may send to add or change one. See docs/ARCHITECTURE.md.
import { z } from 'zod'

export const PlatformSchema = z.enum(['s3', 'azure', 'google-drive'])

export const TemplateKindSchema = z.enum(['upload', 'download'])

export const TemplateIdSchema = z.uuid()

// Saved data without a platform comes from S3, the only platform at first.
export function withS3Platform(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return raw
  return Object.hasOwn(raw, 'platform') ? raw : { ...raw, platform: 's3' }
}

const TemplateBase = { id: TemplateIdSchema, name: z.string(), kind: TemplateKindSchema }

export const S3TemplateSchema = z.object({
  ...TemplateBase,
  platform: z.literal('s3'),
  bucket: z.string(),
  prefix: z.string(),
  region: z.string()
})

export const AzureTemplateSchema = z.object({
  ...TemplateBase,
  platform: z.literal('azure'),
  account: z.string(),
  container: z.string(),
  prefix: z.string()
})

export const DriveTemplateSchema = z.object({
  ...TemplateBase,
  platform: z.literal('google-drive'),
  // A folder's ID, or "root" for My Drive, and the folder's name when the template was saved.
  folderId: z.string(),
  folderName: z.string()
})

export const TemplateSchema = z.preprocess(
  withS3Platform,
  z.discriminatedUnion('platform', [S3TemplateSchema, AzureTemplateSchema, DriveTemplateSchema])
)

// What each platform's keys are when typed in. Google Drive takes the user's own OAuth client; main then signs in.
const S3SecretsSchema = z
  .object({
    platform: z.literal('s3'),
    accessKeyId: z
      .string()
      .trim()
      .regex(/^[A-Z0-9]{16,128}$/, "That doesn't look like an access key ID."),
    secretAccessKey: z.string().trim().min(1, 'Enter the secret access key.').max(256)
  })
  .strict()

const AzureSecretsSchema = z
  .object({
    platform: z.literal('azure'),
    accountKey: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9+/]{40,200}={0,2}$/, "That doesn't look like a storage account key.")
  })
  .strict()

const DriveSecretsSchema = z
  .object({
    platform: z.literal('google-drive'),
    clientId: z
      .string()
      .trim()
      .regex(
        /^[A-Za-z0-9-]{1,200}\.apps\.googleusercontent\.com$/,
        "That doesn't look like an OAuth client ID."
      ),
    clientSecret: z.string().trim().min(1, 'Enter the client secret.').max(256)
  })
  .strict()

export const EnteredSecretsSchema = z.discriminatedUnion('platform', [
  S3SecretsSchema,
  AzureSecretsSchema,
  DriveSecretsSchema
])

const EnteredKeysSchema = z
  .object({ source: z.literal('entered'), secrets: EnteredSecretsSchema })
  .strict()

const CopiedKeysSchema = z
  .object({ source: z.literal('copied'), templateId: TemplateIdSchema })
  .strict()

// A new template's keys: typed in, or copied by main from another template, so they never reach the page.
export const TemplateKeysSchema = z.discriminatedUnion('source', [
  EnteredKeysSchema,
  CopiedKeysSchema
])

// A changed template may also keep the keys it has.
export const TemplateEditKeysSchema = z.discriminatedUnion('source', [
  EnteredKeysSchema,
  CopiedKeysSchema,
  z.object({ source: z.literal('kept') }).strict()
])

const TemplateDetails = {
  name: z.string().trim().min(1, 'Enter a name.').max(100, 'Use at most 100 characters.'),
  kind: TemplateKindSchema,
  platform: PlatformSchema,
  location: z.string().trim().min(1, 'Enter the location.').max(1100)
}

// Typed-in keys must be for the template's own platform.
const keysMatchPlatform = (details: {
  platform: z.infer<typeof PlatformSchema>
  keys: { source: string; secrets?: { platform: string } }
}): boolean =>
  details.keys.secrets === undefined || details.keys.secrets.platform === details.platform
const KEYS_MISMATCH = { message: "The keys don't match the platform.", path: ['keys'] }

export const NewTemplateSchema = z
  .object({ ...TemplateDetails, keys: TemplateKeysSchema })
  .strict()
  .refine(keysMatchPlatform, KEYS_MISMATCH)

export const TemplateEditSchema = z
  .object({ id: TemplateIdSchema, ...TemplateDetails, keys: TemplateEditKeysSchema })
  .strict()
  .refine(keysMatchPlatform, KEYS_MISMATCH)
