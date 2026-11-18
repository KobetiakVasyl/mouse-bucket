// The parts of electron-updater's autoUpdater the update service uses. See docs/PACKAGING.md.
import type { AppUpdater } from 'electron-updater'

export type Updater = Pick<
  AppUpdater,
  | 'on'
  | 'checkForUpdates'
  | 'downloadUpdate'
  | 'quitAndInstall'
  | 'autoDownload'
  | 'autoInstallOnAppQuit'
  | 'allowPrerelease'
>

export interface UpdateSupportInputs {
  isPackaged: boolean
  platform: string
  appImagePath: string | undefined
}
