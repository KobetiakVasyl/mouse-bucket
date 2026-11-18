// A template on each platform, a new one's details, a change to one, and typed-in keys, as their schemas define them.
// See docs/ARCHITECTURE.md.
import type { z } from 'zod'
import type {
  AzureTemplateSchema,
  DriveTemplateSchema,
  EnteredSecretsSchema,
  NewTemplateSchema,
  PlatformSchema,
  S3TemplateSchema,
  TemplateEditSchema,
  TemplateKindSchema,
  TemplateSchema
} from '../validation/template-validation'

export type Platform = z.infer<typeof PlatformSchema>
export type TemplateKind = z.infer<typeof TemplateKindSchema>
export type S3Template = z.infer<typeof S3TemplateSchema>
export type AzureTemplate = z.infer<typeof AzureTemplateSchema>
export type DriveTemplate = z.infer<typeof DriveTemplateSchema>
export type Template = z.infer<typeof TemplateSchema>
export type NewTemplate = z.infer<typeof NewTemplateSchema>
export type TemplateEdit = z.infer<typeof TemplateEditSchema>
export type EnteredSecrets = z.infer<typeof EnteredSecretsSchema>
