// IPC channel names, shared by preload and main. See docs/ARCHITECTURE.md.
export const Channel = {
  appStatus: 'app:status',
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',
  settingsChooseDownloadFolder: 'settings:chooseDownloadFolder',
  templatesList: 'templates:list',
  templatesCreate: 'templates:create',
  templatesDelete: 'templates:delete',
  uploadChooseFiles: 'upload:chooseFiles',
  downloadList: 'download:list',
  downloadFile: 'download:file',
  downloadDelete: 'download:delete',
  downloadRestore: 'download:restore',
  transfersList: 'transfers:list',
  transfersPause: 'transfers:pause',
  transfersResume: 'transfers:resume',
  transfersCancel: 'transfers:cancel'
} as const

// Main sends this event with the full transfer list whenever it changes.
export const TRANSFERS_CHANGED = 'transfers:changed'
