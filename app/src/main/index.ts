// App lifecycle, the hardened main window and the services behind IPC. See docs/SECURITY.md and docs/ARCHITECTURE.md.
import { app, BrowserWindow, dialog, safeStorage, screen, session } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import icon from '../../resources/icon.png?asset'
import { TRANSFERS_CHANGED } from '../shared/channels'
import type { Theme } from '../shared/ipc'
import { appDataDir, appId, environmentFromMode, hotReloadUrl, productName } from './environment'
import { describeError } from './errors'
import { registerIpc } from './ipc/register'
import { systemKeepAwake } from './keep-awake'
import { osKeyVault } from './key-vault'
import { LAUNCH_CHECK_SWITCH, LaunchCheckExit, watchLaunch } from './launch-check'
import { SettingsStore } from './settings'
import { TemplateStore } from './templates'
import { TransferQueue } from './transfers'
import { mainWindowOptions } from './window'
import { type Placement, windowPlacement, WindowStateStore } from './window-state'

const environment = environmentFromMode(import.meta.env.MODE)
const launchCheck = app.commandLine.hasSwitch(LAUNCH_CHECK_SWITCH)

app.setName(productName(environment))
if (process.platform === 'win32') app.setAppUserModelId(appId(environment))

const dataDir = appDataDir({
  environment,
  isPackaged: app.isPackaged,
  appPath: app.getAppPath(),
  platform: process.platform,
  exePath: app.getPath('exe'),
  appImagePath: process.env['APPIMAGE']
})
if (dataDir !== null) app.setPath('userData', dataDir)

const rendererUrl = hotReloadUrl(environment, app.isPackaged, process.env['ELECTRON_RENDERER_URL'])
const rendererFile = join(__dirname, '../renderer/index.html')
const appUrl = rendererUrl === null ? pathToFileURL(rendererFile).href : rendererUrl

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

interface WindowSetup {
  theme: Theme
  transfers: TransferQueue
  windowState: WindowStateStore
  placement: Placement
}

function createWindow({ theme, transfers, windowState, placement }: WindowSetup): void {
  const mainWindow = new BrowserWindow(
    mainWindowOptions({
      environment,
      platform: process.platform,
      preloadPath: join(__dirname, '../preload/index.js'),
      icon,
      theme,
      bounds: placement.bounds
    })
  )

  mainWindow.on('page-title-updated', (event) => event.preventDefault())
  mainWindow.on('ready-to-show', () => {
    if (placement.maximized) mainWindow.maximize()
    mainWindow.show()
  })

  // Closing quits the app, so it asks first while transfers are pending. See docs/UI.md.
  mainWindow.on('close', (event) => {
    if (transfers.active) {
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'warning',
        buttons: ['Keep transferring', 'Quit and cancel them'],
        defaultId: 0,
        cancelId: 0,
        message: 'Uploads or downloads are still running.',
        detail: "Quitting cancels every transfer that hasn't finished."
      })
      if (choice === 0) {
        event.preventDefault()
        return
      }
      transfers.cancelAll()
    }
    try {
      windowState.saveSync({
        bounds: mainWindow.getNormalBounds(),
        maximized: mainWindow.isMaximized()
      })
    } catch (error) {
      console.error("The window's position wasn't saved:", describeError(error))
    }
  })

  if (launchCheck) watchLaunch(mainWindow.webContents, (code) => app.exit(code))

  // The theme travels in the query string, so the page paints in the right colors at once.
  if (rendererUrl !== null) {
    const url = new URL(rendererUrl)
    url.searchParams.set('theme', theme)
    mainWindow.loadURL(url.href)
  } else {
    mainWindow.loadFile(rendererFile, { query: { theme } })
  }
}

async function start(): Promise<void> {
  denyAllPermissions()
  const userData = app.getPath('userData')
  const vault = osKeyVault(safeStorage, process.platform)
  const settings = new SettingsStore(join(userData, 'settings.json'))
  const templates = new TemplateStore(userData, vault)
  const transfers = new TransferQueue({
    concurrency: 3,
    progressIntervalMs: 200,
    keepAwake: systemKeepAwake(),
    onChange: (list) => {
      for (const window of BrowserWindow.getAllWindows()) {
        if (!window.isDestroyed()) window.webContents.send(TRANSFERS_CHANGED, list)
      }
    }
  })
  registerIpc({ settings, templates, transfers, vault }, appUrl)
  const windowState = new WindowStateStore(join(userData, 'window-state.json'))
  const workAreas = screen.getAllDisplays().map((display) => display.workArea)
  const placement = windowPlacement(await windowState.load(), workAreas)
  createWindow({ theme: (await settings.get()).theme, transfers, windowState, placement })
}

function focusMainWindow(): void {
  const windows = BrowserWindow.getAllWindows()
  if (windows.length === 0) return
  const mainWindow = windows[0]
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
}

// One running copy per app data folder; starting another focuses the first. See docs/ENVIRONMENTS.md.
if (!app.requestSingleInstanceLock()) {
  app.exit(launchCheck ? LaunchCheckExit.alreadyRunning : 0)
} else {
  app.on('second-instance', focusMainWindow)
  app.on('window-all-closed', () => app.quit())
  app
    .whenReady()
    .then(start)
    .catch((error: unknown) => {
      console.error('The app failed to start:', error instanceof Error ? error.message : error)
      app.exit(1)
    })
}
