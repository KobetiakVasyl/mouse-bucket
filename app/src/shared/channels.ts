// IPC channel names and the result envelope, shared by preload and main. See docs/ARCHITECTURE.md.
export const Channel = {
  appStatus: 'app:status',
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',
  templatesList: 'templates:list',
  templatesCreate: 'templates:create',
  templatesDelete: 'templates:delete',
  uploadChooseFiles: 'upload:chooseFiles',
  downloadList: 'download:list',
  downloadFile: 'download:file',
  downloadDelete: 'download:delete',
  downloadRestore: 'download:restore',
  transfersList: 'transfers:list',
  transfersCancel: 'transfers:cancel'
} as const

export type InvokeChannel = (typeof Channel)[keyof typeof Channel]

// Main sends this event with the full transfer list whenever it changes.
export const TRANSFERS_CHANGED = 'transfers:changed'

export type IpcResult<T> = { ok: true; value: T } | { ok: false; error: string }
