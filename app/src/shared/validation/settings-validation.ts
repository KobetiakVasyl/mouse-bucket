// What the settings hold, and what a change to them may contain. See docs/ARCHITECTURE.md.
import { z } from 'zod'

export const ThemeSchema = z.enum(['dark', 'light'])

export const SettingsSchema = z.object({ theme: ThemeSchema, welcomeSeen: z.boolean() })

export const SettingsUpdateSchema = SettingsSchema.partial().strict()
