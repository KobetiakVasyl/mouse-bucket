// A template, a new one's details and a change to one, as their schemas define them. See docs/ARCHITECTURE.md.
import type { z } from 'zod'
import type {
  NewTemplateSchema,
  TemplateEditSchema,
  TemplateKindSchema,
  TemplateSchema
} from '../validation/template-validation'

export type TemplateKind = z.infer<typeof TemplateKindSchema>
export type Template = z.infer<typeof TemplateSchema>
export type NewTemplate = z.infer<typeof NewTemplateSchema>
export type TemplateEdit = z.infer<typeof TemplateEditSchema>
