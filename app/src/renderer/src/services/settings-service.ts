// Reads and changes the app's settings in main. See docs/ARCHITECTURE.md.
import type { Api } from '../../../shared/types/ipc-types'
import type { Settings, SettingsUpdate } from '../../../shared/types/settings-types'

export class SettingsService {
  constructor(private readonly api: Pick<Api, 'getSettings' | 'updateSettings'>) {}

  get(): Promise<Settings> {
    return this.api.getSettings()
  }

  update(update: SettingsUpdate): Promise<Settings> {
    return this.api.updateSettings(update)
  }
}

export const settingsService = new SettingsService(window.api)
