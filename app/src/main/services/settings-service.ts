// The app's settings in settings.json: the theme, the welcome page, the uploads' storage class and the download folder. See docs/UI.md.
import type { WebContents } from 'electron'
import type { Settings, SettingsUpdate } from '../../shared/types/settings-types'
import { DOWNLOAD_FOLDER_DIALOG_TITLE } from '../constants/dialog-constants'
import { DEFAULT_SETTINGS } from '../constants/settings-constants'
import {
  parseJson,
  readIfExists,
  serialize,
  toJsonFile,
  writeAtomically
} from '../utils/file-utils'
import { StoredSettingsSchema } from '../validation/data-file-validation'
import type { DialogService } from './dialog-service'

export class SettingsService {
  private readonly serial = serialize()
  private readonly defaults: Settings

  constructor(
    private readonly path: string,
    // The system's Downloads folder, used until another folder is chosen.
    downloadsFolder: string,
    private readonly dialogs: Pick<DialogService, 'chooseFolder'>
  ) {
    this.defaults = { ...DEFAULT_SETTINGS, downloadFolder: downloadsFolder }
  }

  async get(): Promise<Settings> {
    return { ...this.defaults, ...(await this.stored()) }
  }

  update(update: SettingsUpdate): Promise<Settings> {
    return this.save(update)
  }

  // Only main's folder picker changes the download folder, so the page never chooses where files are written.
  async chooseDownloadFolder(sender: WebContents): Promise<Settings> {
    const current = (await this.get()).downloadFolder
    const folder = await this.dialogs.chooseFolder(sender, DOWNLOAD_FOLDER_DIALOG_TITLE, current)
    return folder === null ? this.get() : this.save({ downloadFolder: folder })
  }

  // The file keeps only what was changed, so the defaults can follow the system. Unreadable or invalid settings count as none.
  private async stored(): Promise<Partial<Settings>> {
    const raw = await readIfExists(this.path)
    if (raw === undefined) return {}
    const parsed = StoredSettingsSchema.safeParse(parseJson(raw.toString('utf8')))
    return parsed.success ? parsed.data : {}
  }

  private save(change: Partial<Settings>): Promise<Settings> {
    return this.serial(async () => {
      const stored = { ...(await this.stored()), ...change }
      await writeAtomically(this.path, toJsonFile(stored))
      return { ...this.defaults, ...stored }
    })
  }
}
