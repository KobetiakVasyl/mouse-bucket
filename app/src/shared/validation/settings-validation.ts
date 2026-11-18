// What the settings hold, and what a change to them may contain. See docs/ARCHITECTURE.md.
import { z } from 'zod'
import { UploadStorageClassSchema } from './s3-validation'

export const ThemeSchema = z.enum(['dark', 'light'])

export const SettingsSchema = z.object({
  theme: ThemeSchema,
  welcomeSeen: z.boolean(),
  // The storage class the Upload page starts with.
  defaultStorageClass: UploadStorageClassSchema
})

export const SettingsUpdateSchema = SettingsSchema.partial().strict()
