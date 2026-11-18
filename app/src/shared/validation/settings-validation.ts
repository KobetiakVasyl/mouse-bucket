// What the settings hold, and what a change to them may contain. See docs/ARCHITECTURE.md.
import { z } from 'zod'
import { UploadStorageClassSchema } from './s3-validation'

export const ThemeSchema = z.enum(['dark', 'light'])

export const SettingsSchema = z.object({
  theme: ThemeSchema,
  welcomeSeen: z.boolean(),
  // The storage class the Upload page starts with.
  defaultStorageClass: UploadStorageClassSchema,
  // Where downloads are saved: the system's Downloads folder until another is chosen.
  downloadFolder: z.string().min(1).max(4096)
})

// The page may show the download folder but not set it: only main's folder picker does.
export const SettingsUpdateSchema = SettingsSchema.omit({ downloadFolder: true }).partial().strict()
