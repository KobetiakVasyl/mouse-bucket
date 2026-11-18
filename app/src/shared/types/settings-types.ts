// The settings and the theme, as their schemas define them. See docs/UI.md.
import type { z } from 'zod'
import type {
  SettingsSchema,
  SettingsUpdateSchema,
  ThemeSchema
} from '../validation/settings-validation'

export type Theme = z.infer<typeof ThemeSchema>
export type Settings = z.infer<typeof SettingsSchema>
export type SettingsUpdate = z.infer<typeof SettingsUpdateSchema>
