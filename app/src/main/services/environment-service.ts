// Which environment this build is, and what differs by it: names, IDs, DevTools, the data folder and hot reload. See docs/ENVIRONMENTS.md.
import { join, posix, win32 } from 'node:path'
import { APP_ID, PRODUCT_NAME } from '../constants/app-constants'
import type { DataDirInputs, Environment } from '../types/environment-types'
import { isEnvironment } from '../validation/environment-validation'

export class EnvironmentService {
  constructor(readonly name: Environment) {}

  // A build in any other mode stops at startup.
  static fromMode(mode: string): EnvironmentService {
    if (!isEnvironment(mode)) {
      throw new Error(
        `Unknown build mode "${mode}". Build with --mode staging or --mode production.`
      )
    }
    return new EnvironmentService(mode)
  }

  get isStaging(): boolean {
    return this.name === 'staging'
  }

  get productName(): string {
    return this.isStaging ? `${PRODUCT_NAME} Staging` : PRODUCT_NAME
  }

  get appId(): string {
    return this.isStaging ? `${APP_ID}.staging` : APP_ID
  }

  get windowTitle(): string {
    return this.isStaging ? `${PRODUCT_NAME} STAGING` : PRODUCT_NAME
  }

  get devToolsAllowed(): boolean {
    return this.isStaging
  }

  // Where the app keeps its data: where it runs from, not the user profile. null means Electron's default.
  dataDir(inputs: DataDirInputs): string | null {
    const { isPackaged, appPath, platform, exePath, appImagePath } = inputs
    if (!isPackaged) return join(appPath, 'data', this.name)
    if (platform === 'win32') return win32.join(win32.dirname(exePath), 'data')
    if (platform !== 'linux') return null
    if (appImagePath === undefined) return null
    return posix.join(posix.dirname(appImagePath), `${PRODUCT_NAME}-${this.name}-data`)
  }

  // The hot-reload server's URL, honored only in unpackaged staging runs on localhost. See docs/SECURITY.md.
  hotReloadUrl(isPackaged: boolean, url: string | undefined): string | null {
    if (url === undefined) return null
    if (isPackaged) return null
    if (!this.isStaging) return null
    const { protocol, hostname } = new URL(url)
    const local = protocol === 'http:' && hostname === 'localhost'
    return local ? url : null
  }
}
