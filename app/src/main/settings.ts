// The app's settings, such as the theme and whether the welcome page was seen, kept in settings.json. See docs/UI.md.
import { Settings, type SettingsUpdate } from '../shared/ipc'
import { parseJson, readIfExists, serialize, writeAtomically } from './store/files'

export const DEFAULT_SETTINGS: Settings = { theme: 'dark', welcomeSeen: false }

export class SettingsStore {
  private readonly serial = serialize()

  constructor(private readonly path: string) {}

  // Unreadable or partly invalid settings fall back to the defaults.
  async get(): Promise<Settings> {
    const raw = await readIfExists(this.path)
    if (raw === undefined) return { ...DEFAULT_SETTINGS }
    const parsed = Settings.partial().safeParse(parseJson(raw.toString('utf8')))
    return parsed.success ? { ...DEFAULT_SETTINGS, ...parsed.data } : { ...DEFAULT_SETTINGS }
  }

  update(update: SettingsUpdate): Promise<Settings> {
    return this.serial(async () => {
      const next = { ...(await this.get()), ...update }
      await writeAtomically(this.path, `${JSON.stringify(next, null, 2)}\n`)
      return next
    })
  }
}
