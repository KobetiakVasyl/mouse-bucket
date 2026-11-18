// A handler for one invoke channel, the services behind them, and the parts of Electron's IPC that main uses. See docs/ARCHITECTURE.md.
import type { IpcMain, IpcMainInvokeEvent } from 'electron'
import type { InvokeChannel, Requests, Responses } from '../../shared/types/ipc-types'
import type { DownloadService } from '../services/download-service'
import type { GoogleSignInService } from '../services/google-sign-in-service'
import type { SettingsService } from '../services/settings-service'
import type { TemplateService } from '../services/template-service'
import type { TransferService } from '../services/transfer-service'
import type { UpdateService } from '../services/update-service'
import type { UploadService } from '../services/upload-service'
import type { KeyVault } from './key-vault-types'

export type IpcHandler<C extends InvokeChannel> = (
  input: Requests[C],
  event: IpcMainInvokeEvent
) => Promise<Responses[C]>

export type IpcRegistry = Pick<IpcMain, 'handle'>

export interface IpcServices {
  vault: Pick<KeyVault, 'available'>
  settings: Pick<SettingsService, 'get' | 'update' | 'chooseDownloadFolder'>
  templates: Pick<TemplateService, 'list' | 'add' | 'update' | 'delete'>
  google: Pick<GoogleSignInService, 'cancel'>
  uploads: Pick<UploadService, 'chooseFiles' | 'chooseFolder' | 'uploadPaths'>
  downloads: Pick<DownloadService, 'listFolder' | 'downloadFile' | 'deleteFile' | 'restoreFile'>
  transfers: Pick<TransferService, 'list' | 'pause' | 'resume' | 'cancel'>
  updates: Pick<UpdateService, 'status' | 'check' | 'download' | 'install'>
  // The running app's version, such as 0.2.0, or 0.2.0-staging.17 for a staging build.
  version: string
}
