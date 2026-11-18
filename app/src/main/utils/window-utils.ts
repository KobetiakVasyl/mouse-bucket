// The main window's options, including the hardened webPreferences, and where it opens. See docs/SECURITY.md and docs/UI.md.
import type { BrowserWindowConstructorOptions } from 'electron'
import {
  DEFAULT_WINDOW_SIZE,
  MIN_VISIBLE_PIXELS,
  MIN_WINDOW_SIZE
} from '../constants/window-constants'
import { PAPER } from '../constants/theme-constants'
import type { Bounds, MainWindowInputs, Placement, WindowState } from '../types/window-types'

export function mainWindowOptions(inputs: MainWindowInputs): BrowserWindowConstructorOptions {
  const { environment, platform, preloadPath, icon, theme, bounds } = inputs
  return {
    ...(bounds === null ? DEFAULT_WINDOW_SIZE : bounds),
    ...MIN_WINDOW_SIZE,
    show: false,
    autoHideMenuBar: true,
    title: environment.windowTitle,
    backgroundColor: PAPER[theme],
    ...(platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      devTools: environment.devToolsAllowed
    }
  }
}

function visibleOn(area: Bounds, bounds: Bounds): boolean {
  const width = Math.min(area.x + area.width, bounds.x + bounds.width) - Math.max(area.x, bounds.x)
  const height =
    Math.min(area.y + area.height, bounds.y + bounds.height) - Math.max(area.y, bounds.y)
  return width >= MIN_VISIBLE_PIXELS && height >= MIN_VISIBLE_PIXELS
}

// The saved place, while it's still on one of the screens; otherwise maximized, as on the first start.
export function windowPlacement(saved: WindowState | null, workAreas: Bounds[]): Placement {
  if (saved === null) return { bounds: null, maximized: true }
  if (!workAreas.some((area) => visibleOn(area, saved.bounds))) {
    return { bounds: null, maximized: true }
  }
  return { bounds: saved.bounds, maximized: saved.maximized }
}
