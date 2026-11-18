// Starts the app: one copy per data folder, main's services wired together, and the main window. See docs/ARCHITECTURE.md and docs/SECURITY.md.
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, ipcMain, powerSaveBlocker, safeStorage, screen, session } from 'electron'
import icon from '../../resources/icon.png?asset'
import { TRANSFERS_CHANGED } from '../shared/constants/ipc-constants'
import { DATA_FILES } from './constants/data-file-constants'
import { LAUNCH_CHECK_SWITCH, LaunchCheckExit } from './constants/launch-check-constants'
import { PROGRESS_INTERVAL_MS, TRANSFER_CONCURRENCY } from './constants/transfer-constants'
import { DialogService } from './services/dialog-service'
import { DownloadService } from './services/download-service'
import { EnvironmentService } from './services/environment-service'
import { IpcService } from './services/ipc-service'
import { KeepAwakeService } from './services/keep-awake-service'
import { KeyVaultService } from './services/key-vault-service'
import { LaunchCheckService } from './services/launch-check-service'
import { S3Service } from './services/s3-service'
import { SettingsService } from './services/settings-service'
import { TemplateService } from './services/template-service'
import { TransferService } from './services/transfer-service'
import { UploadService } from './services/upload-service'
import { WindowService } from './services/window-service'
import { WindowStateService } from './services/window-state-service'
import { windowPlacement } from './utils/window-utils'

const environment = EnvironmentService.fromMode(import.meta.env.MODE)
const launchCheck = app.commandLine.hasSwitch(LAUNCH_CHECK_SWITCH)

app.setName(environment.productName)
if (process.platform === 'win32') app.setAppUserModelId(environment.appId)

const dataDir = environment.dataDir({
  isPackaged: app.isPackaged,
  appPath: app.getAppPath(),
  platform: process.platform,
  exePath: app.getPath('exe'),
  appImagePath: process.env['APPIMAGE']
})
if (dataDir !== null) app.setPath('userData', dataDir)

const page = {
  url: environment.hotReloadUrl(app.isPackaged, process.env['ELECTRON_RENDERER_URL']),
  file: join(__dirname, '../renderer/index.html')
}
const appUrl = page.url === null ? pathToFileURL(page.file).href : page.url

// Blocks new windows and navigation away from the app in every web contents. See docs/SECURITY.md.
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
  contents.on('will-navigate', (event) => event.preventDefault())
})

// Denies every permission request, such as the camera or notifications. See docs/SECURITY.md.
function denyAllPermissions(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) =>
    callback(false)
  )
  session.defaultSession.setPermissionCheckHandler(() => false)
}

async function start(): Promise<void> {
  denyAllPermissions()
  const userData = app.getPath('userData')
  const vault = new KeyVaultService(safeStorage, process.platform)
  const s3 = new S3Service()
  const dialogs = new DialogService()
  const settings = new SettingsService(join(userData, DATA_FILES.settings))
  const templates = new TemplateService(userData, vault, s3)
  const transfers = new TransferService({
    concurrency: TRANSFER_CONCURRENCY,
    progressIntervalMs: PROGRESS_INTERVAL_MS,
    keepAwake: new KeepAwakeService(powerSaveBlocker),
    onChange: (list) => WindowService.sendToAll(TRANSFERS_CHANGED, list)
  })
  const uploads = new UploadService(templates, s3, transfers, dialogs)
  const downloads = new DownloadService(templates, s3, transfers, dialogs, () =>
    app.getPath('downloads')
  )
  new IpcService(ipcMain, appUrl, process.platform).register({
    vault,
    settings,
    templates,
    uploads,
    downloads,
    transfers
  })

  const windowState = new WindowStateService(join(userData, DATA_FILES.windowState))
  const windows = new WindowService({
    environment,
    page,
    preloadPath: join(__dirname, '../preload/index.js'),
    icon,
    transfers,
    windowState,
    dialogs,
    launchCheck: launchCheck ? new LaunchCheckService((code) => app.exit(code)) : null
  })
  // One running copy per app data folder; starting another focuses the first. See docs/ENVIRONMENTS.md.
  app.on('second-instance', () => windows.focus())
  const workAreas = screen.getAllDisplays().map((display) => display.workArea)
  const placement = windowPlacement(await windowState.load(), workAreas)
  windows.open((await settings.get()).theme, placement)
}

if (!app.requestSingleInstanceLock()) {
  app.exit(launchCheck ? LaunchCheckExit.alreadyRunning : 0)
} else {
  app.on('window-all-closed', () => app.quit())
  app
    .whenReady()
    .then(start)
    .catch((error: unknown) => {
      console.error('The app failed to start:', error instanceof Error ? error.message : error)
      app.exit(1)
    })
}
