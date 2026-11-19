// IPC channel names, shared by preload and main. See docs/ARCHITECTURE.md.
export const Channel = {
  appStatus: 'app:status',
  appCopyText: 'app:copyText',
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',
  settingsChooseDownloadFolder: 'settings:chooseDownloadFolder',
  templatesList: 'templates:list',
  templatesCreate: 'templates:create',
  templatesUpdate: 'templates:update',
  templatesDelete: 'templates:delete',
  templatesCancelSignIn: 'templates:cancelSignIn',
  uploadChooseFiles: 'upload:chooseFiles',
  uploadChooseFolder: 'upload:chooseFolder',
  uploadPaths: 'upload:paths',
  downloadList: 'download:list',
  downloadFile: 'download:file',
  downloadDelete: 'download:delete',
  downloadRestore: 'download:restore',
  downloadFolderSummary: 'download:folderSummary',
  downloadFolder: 'download:folder',
  downloadDeleteFolder: 'download:deleteFolder',
  downloadRestoreFolder: 'download:restoreFolder',
  transfersList: 'transfers:list',
  transfersPause: 'transfers:pause',
  transfersResume: 'transfers:resume',
  transfersCancel: 'transfers:cancel',
  updatesStatus: 'updates:status',
  updatesCheck: 'updates:check',
  updatesDownload: 'updates:download',
  updatesInstall: 'updates:install'
} as const

// Main sends this event with the full transfer list whenever it changes.
export const TRANSFERS_CHANGED = 'transfers:changed'

// Main sends this event with the update state whenever it changes.
export const UPDATES_CHANGED = 'updates:changed'
