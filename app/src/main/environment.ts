// Which environment this build is, and what differs by it. See docs/ENVIRONMENTS.md.
import { join, posix, win32 } from 'path'

export type Environment = 'staging' | 'production'

// The production name and ID. app/electron-builder.yml and electron-builder.staging.yml must match. See docs/ENVIRONMENTS.md.
const PRODUCT_NAME = 'MouseBucket'
const APP_ID = 'io.github.kobetiakvasyl.mousebucket'

export function environmentFromMode(mode: string): Environment {
  if (mode === 'staging' || mode === 'production') return mode
  throw new Error(`Unknown build mode "${mode}". Build with --mode staging or --mode production.`)
}

export function productName(environment: Environment): string {
  return environment === 'staging' ? `${PRODUCT_NAME} Staging` : PRODUCT_NAME
}

export function appId(environment: Environment): string {
  return environment === 'staging' ? `${APP_ID}.staging` : APP_ID
}

export function windowTitle(environment: Environment): string {
  return environment === 'staging' ? `${PRODUCT_NAME} STAGING` : PRODUCT_NAME
}

export function devToolsAllowed(environment: Environment): boolean {
  return environment === 'staging'
}

export interface DataDirInputs {
  environment: Environment
  isPackaged: boolean
  appPath: string
  platform: string
  exePath: string
  appImagePath: string | undefined
}

// Where the app keeps its data: where it runs from, not the user profile. See docs/ENVIRONMENTS.md.
export function appDataDir(inputs: DataDirInputs): string | undefined {
  const { environment, isPackaged, appPath, platform, exePath, appImagePath } = inputs
  if (!isPackaged) return join(appPath, 'data', environment)
  if (platform === 'win32') return win32.join(win32.dirname(exePath), 'data')
  if (platform === 'linux' && appImagePath) {
    return posix.join(posix.dirname(appImagePath), `${PRODUCT_NAME}-${environment}-data`)
  }
  return undefined
}

// The hot-reload server's URL, honored only in unpackaged staging runs on localhost. See docs/SECURITY.md.
export function hotReloadUrl(
  environment: Environment,
  isPackaged: boolean,
  url: string | undefined
): string | undefined {
  if (environment !== 'staging' || isPackaged || !url) return undefined
  const { protocol, hostname } = new URL(url)
  if (protocol !== 'http:' || hostname !== 'localhost') return undefined
  return url
}
