// The main window's options, including the hardened webPreferences. See docs/SECURITY.md.
import type { BrowserWindowConstructorOptions } from 'electron'
import { devToolsAllowed, type Environment, windowTitle } from './environment'

export interface MainWindowInputs {
  environment: Environment
  platform: string
  preloadPath: string
  icon: string
}

export function mainWindowOptions(inputs: MainWindowInputs): BrowserWindowConstructorOptions {
  const { environment, platform, preloadPath, icon } = inputs
  return {
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    title: windowTitle(environment),
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
