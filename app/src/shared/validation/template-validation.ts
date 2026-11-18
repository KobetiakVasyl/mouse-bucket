// What a template is, and what the page may send to add one. See docs/ARCHITECTURE.md.
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

// A new template's keys: typed in, or copied by main from another template, so they never reach the page.
export const TemplateKeysSchema = z.discriminatedUnion('source', [
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
  z.object({ source: z.literal('copied'), templateId: TemplateIdSchema }).strict()
])

export const NewTemplateSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a name.').max(100, 'Use at most 100 characters.'),
    kind: TemplateKindSchema,
    location: z.string().trim().min(1, 'Enter the S3 location.').max(1100),
    keys: TemplateKeysSchema
  })
  .strict()
