// What the settings hold, and what a change to them may contain. See docs/ARCHITECTURE.md.
import { z } from 'zod'
import { RESTORE_DAYS } from '../constants/storage-constants'
import { AccessTierSchema, RestoreTierSchema, UploadStorageClassSchema } from './storage-validation'

export const ThemeSchema = z.enum(['dark', 'light'])

export const SettingsSchema = z.object({
  theme: ThemeSchema,
  welcomeSeen: z.boolean(),
  // The S3 storage class and the Azure access tier the Upload page starts with.
  defaultStorageClass: UploadStorageClassSchema,
  defaultAccessTier: AccessTierSchema,
  // The speed and days the S3 Restore dialog starts with.
  defaultRestoreTier: RestoreTierSchema,
  defaultRestoreDays: z.number().int().min(RESTORE_DAYS.min).max(RESTORE_DAYS.max),
  // Where downloads are saved: the system's Downloads folder until another is chosen.
  downloadFolder: z.string().min(1).max(4096)
})

// The page may show the download folder but not set it: only main's folder picker does.
export const SettingsUpdateSchema = SettingsSchema.omit({ downloadFolder: true }).partial().strict()
