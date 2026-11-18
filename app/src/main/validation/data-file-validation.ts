// What each of the app's files in its data folder must contain to be used. See docs/ENVIRONMENTS.md.
import { z } from 'zod'
import { SettingsSchema } from '../../shared/validation/settings-validation'
import { TemplateSchema } from '../../shared/validation/template-validation'

// Settings may be partly missing; the defaults fill in the rest.
export const StoredSettingsSchema = SettingsSchema.partial()

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
