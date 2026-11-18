// What a template is, and what the page may send to add or change one. See docs/ARCHITECTURE.md.
import { z } from 'zod'

export const TemplateKindSchema = z.enum(['upload', 'download'])

export const TemplateIdSchema = z.uuid()

export const TemplateSchema = z.object({
  id: TemplateIdSchema,
  name: z.string(),
  kind: TemplateKindSchema,
  bucket: z.string(),
  prefix: z.string(),
  region: z.string()
})

const EnteredKeysSchema = z
  .object({
    source: z.literal('entered'),
    accessKeyId: z
      .string()
      .trim()
      .regex(/^[A-Z0-9]{16,128}$/, "That doesn't look like an access key ID."),
    secretAccessKey: z.string().trim().min(1, 'Enter the secret access key.').max(256)
  })
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
  location: z.string().trim().min(1, 'Enter the S3 location.').max(1100)
}

export const NewTemplateSchema = z.object({ ...TemplateDetails, keys: TemplateKeysSchema }).strict()

export const TemplateEditSchema = z
  .object({ id: TemplateIdSchema, ...TemplateDetails, keys: TemplateEditKeysSchema })
  .strict()
