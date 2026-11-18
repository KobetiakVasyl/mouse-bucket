// The app's settings, such as the theme and whether the welcome page was seen, kept in settings.json. See docs/UI.md.
import type { Settings, SettingsUpdate } from '../../shared/types/settings-types'
import { DEFAULT_SETTINGS } from '../constants/settings-constants'
import {
  parseJson,
  readIfExists,
  serialize,
  toJsonFile,
  writeAtomically
} from '../utils/file-utils'
import { StoredSettingsSchema } from '../validation/data-file-validation'

export class SettingsService {
  private readonly serial = serialize()

  constructor(private readonly path: string) {}

  // Unreadable or partly invalid settings fall back to the defaults.
  async get(): Promise<Settings> {
    const raw = await readIfExists(this.path)
    if (raw === undefined) return { ...DEFAULT_SETTINGS }
    const parsed = StoredSettingsSchema.safeParse(parseJson(raw.toString('utf8')))
    return parsed.success ? { ...DEFAULT_SETTINGS, ...parsed.data } : { ...DEFAULT_SETTINGS }
  }

  update(update: SettingsUpdate): Promise<Settings> {
    return this.serial(async () => {
      const next = { ...(await this.get()), ...update }
      await writeAtomically(this.path, toJsonFile(next))
      return next
    })
  }
}
