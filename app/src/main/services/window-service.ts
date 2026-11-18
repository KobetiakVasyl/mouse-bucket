// Opens the hardened main window where it was, asks before closing mid-transfer, and loads the page. See docs/SECURITY.md and docs/UI.md.
import { BrowserWindow, type Event } from 'electron'
import type { Theme } from '../../shared/types/settings-types'
import type { Placement, WindowServiceOptions } from '../types/window-types'
import { describeError } from '../utils/error-utils'
import { mainWindowOptions } from '../utils/window-utils'

export class WindowService {
  constructor(private readonly options: WindowServiceOptions) {}

  // Sends an event to the page in every open window.
  static sendToAll(channel: string, payload: unknown): void {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send(channel, payload)
    }
  }

  open(theme: Theme, placement: Placement): void {
    const { environment, preloadPath, icon, launchCheck } = this.options
    const window = new BrowserWindow(
      mainWindowOptions({
        environment,
        platform: process.platform,
        preloadPath,
        icon,
        theme,
        bounds: placement.bounds
      })
    )

    window.on('page-title-updated', (event) => event.preventDefault())
    window.on('ready-to-show', () => {
      if (placement.maximized) window.maximize()
      window.show()
    })
    window.on('close', (event) => this.close(window, event))
    if (launchCheck !== null) launchCheck.watch(window.webContents)
    this.load(window, theme)
  }

  // Brings the window back when another copy of the app is started.
  focus(): void {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length === 0) return
    const window = windows[0]
    if (window.isMinimized()) window.restore()
    window.focus()
  }

  // Closing quits the app, so it asks first while transfers are pending, then pauses them to resume later. See docs/UI.md.
  private close(window: BrowserWindow, event: Event): void {
    const { transfers, dialogs, windowState } = this.options
    if (transfers.active) {
      if (!dialogs.confirmQuit(window)) {
        event.preventDefault()
        return
      }
      transfers.pauseAll()
    }
    try {
      windowState.saveSync({ bounds: window.getNormalBounds(), maximized: window.isMaximized() })
    } catch (error) {
      console.error("The window's position wasn't saved:", describeError(error))
    }
  }

  // The theme travels in the query string, so the page paints in the right colors at once.
  private load(window: BrowserWindow, theme: Theme): void {
    const { url, file } = this.options.page
    if (url === null) {
      void window.loadFile(file, { query: { theme } })
      return
    }
    const withTheme = new URL(url)
    withTheme.searchParams.set('theme', theme)
    void window.loadURL(withTheme.href)
  }
}
