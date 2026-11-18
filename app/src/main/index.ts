// App lifecycle and the hardened main window. See docs/SECURITY.md and docs/ENVIRONMENTS.md.
import { app, BrowserWindow, session } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { appDataDir, appId, environmentFromMode, hotReloadUrl, productName } from './environment'
import { LAUNCH_CHECK_SWITCH, LaunchCheckExit, watchLaunch } from './launch-check'
import { mainWindowOptions } from './window'

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
if (dataDir) app.setPath('userData', dataDir)

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

function createWindow(): void {
  const mainWindow = new BrowserWindow(
    mainWindowOptions({
      environment,
      platform: process.platform,
      preloadPath: join(__dirname, '../preload/index.js'),
      icon
    })
  )

  mainWindow.on('page-title-updated', (event) => event.preventDefault())
  mainWindow.on('ready-to-show', () => mainWindow.show())

  if (launchCheck) watchLaunch(mainWindow.webContents, (code) => app.exit(code))

  const rendererUrl = hotReloadUrl(
    environment,
    app.isPackaged,
    process.env['ELECTRON_RENDERER_URL']
  )
  if (rendererUrl) mainWindow.loadURL(rendererUrl)
  else mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
}

function focusMainWindow(): void {
  const [mainWindow] = BrowserWindow.getAllWindows()
  if (!mainWindow) return
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
    .then(() => {
      denyAllPermissions()
      createWindow()
    })
    .catch((error: unknown) => {
      console.error('The app failed to start:', error)
      app.exit(1)
    })
}
