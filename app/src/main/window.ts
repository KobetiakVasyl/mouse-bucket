// The main window's options, including the hardened webPreferences. See docs/SECURITY.md.
import type { BrowserWindowConstructorOptions } from 'electron'
import type { Theme } from '../shared/ipc'
import { PAPER } from '../shared/theme'
import { devToolsAllowed, type Environment, windowTitle } from './environment'
import type { Bounds } from './window-state'

const DEFAULT_SIZE = { width: 1000, height: 700 }

export interface MainWindowInputs {
  environment: Environment
  platform: string
  preloadPath: string
  icon: string
  theme: Theme
  // null for the default size, centered.
  bounds: Bounds | null
}

export function mainWindowOptions(inputs: MainWindowInputs): BrowserWindowConstructorOptions {
  const { environment, platform, preloadPath, icon, theme, bounds } = inputs
  return {
    ...(bounds === null ? DEFAULT_SIZE : bounds),
    minWidth: 720,
    minHeight: 480,
    show: false,
    autoHideMenuBar: true,
    title: windowTitle(environment),
    backgroundColor: PAPER[theme],
    ...(platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      devTools: devToolsAllowed(environment)
    }
  }
}
