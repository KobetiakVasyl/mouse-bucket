// The renderer's only bridge to main: one typed method per IPC channel. See docs/ARCHITECTURE.md.
import { contextBridge, ipcRenderer, type IpcRendererEvent, webUtils } from 'electron'
import { Channel, TRANSFERS_CHANGED } from '../shared/constants/ipc-constants'
import type { Api, IpcResult } from '../shared/types/ipc-types'
import type { Transfer } from '../shared/types/transfer-types'

async function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  const result: IpcResult<T> = await ipcRenderer.invoke(channel, payload)
  if (!result.ok) throw new Error(result.error)
  return result.value
}

const api: Api = {
  getStatus: () => invoke(Channel.appStatus),
  getSettings: () => invoke(Channel.settingsGet),
  updateSettings: (update) => invoke(Channel.settingsUpdate, update),
  chooseDownloadFolder: () => invoke(Channel.settingsChooseDownloadFolder),
  listTemplates: () => invoke(Channel.templatesList),
  createTemplate: (template) => invoke(Channel.templatesCreate, template),
  deleteTemplate: (id) => invoke(Channel.templatesDelete, id),
  chooseFilesToUpload: (request) => invoke(Channel.uploadChooseFiles, request),
  chooseFolderToUpload: (request) => invoke(Channel.uploadChooseFolder, request),
  // A dropped file's path comes from the file itself; a file the page made has none, and is left out. See docs/SECURITY.md.
  uploadDroppedFiles: async (request, files) => {
    const paths = files.map((file) => webUtils.getPathForFile(file)).filter((path) => path !== '')
    return paths.length === 0 ? 0 : invoke(Channel.uploadPaths, { ...request, paths })
  },
  listFolder: (request) => invoke(Channel.downloadList, request),
  downloadFile: (request) => invoke(Channel.downloadFile, request),
  deleteFile: (request) => invoke(Channel.downloadDelete, request),
  restoreFile: (request) => invoke(Channel.downloadRestore, request),
  listTransfers: () => invoke(Channel.transfersList),
  pauseTransfer: (id) => invoke(Channel.transfersPause, id),
  resumeTransfer: (id) => invoke(Channel.transfersResume, id),
  cancelTransfer: (id) => invoke(Channel.transfersCancel, id),
  onTransfersChanged: (listener) => {
    const forward = (_event: IpcRendererEvent, transfers: Transfer[]): void => listener(transfers)
    ipcRenderer.on(TRANSFERS_CHANGED, forward)
    return () => {
      ipcRenderer.removeListener(TRANSFERS_CHANGED, forward)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
