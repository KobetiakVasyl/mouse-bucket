import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EnvironmentService } from '../../../../src/main/services/environment-service'
import type { DataDirInputs } from '../../../../src/main/types/environment-types'

const STAGING = new EnvironmentService('staging')
const PRODUCTION = new EnvironmentService('production')

describe('fromMode', () => {
  it('accepts the two build modes', () => {
    expect(EnvironmentService.fromMode('staging').name).toBe('staging')
    expect(EnvironmentService.fromMode('production').name).toBe('production')
  })

  it('rejects any other mode', () => {
    expect(() => EnvironmentService.fromMode('development')).toThrow(
      'Unknown build mode "development"'
    )
  })
})

describe('productName and appId', () => {
  it('uses the production identity in production', () => {
    expect(PRODUCTION.productName).toBe('MouseBucket')
    expect(PRODUCTION.appId).toBe('io.github.kobetiakvasyl.mousebucket')
  })

  it('gives staging its own identity', () => {
    expect(STAGING.productName).toBe('MouseBucket Staging')
    expect(STAGING.appId).toBe('io.github.kobetiakvasyl.mousebucket.staging')
  })
})

describe('windowTitle', () => {
  it('marks staging', () => {
    expect(STAGING.windowTitle).toBe('MouseBucket STAGING')
  })

  it('leaves production unmarked', () => {
    expect(PRODUCTION.windowTitle).toBe('MouseBucket')
  })
})

describe('devToolsAllowed', () => {
  it('allows DevTools only in staging', () => {
    expect(STAGING.devToolsAllowed).toBe(true)
    expect(PRODUCTION.devToolsAllowed).toBe(false)
  })
})

describe('dataDir', () => {
  const base: DataDirInputs = {
    isPackaged: true,
    appPath: '/repo/app',
    platform: 'linux',
    exePath: '/opt/MouseBucket/MouseBucket',
    appImagePath: undefined
  }

  it('keeps data in the app folder, per environment, when running from source', () => {
    expect(STAGING.dataDir({ ...base, isPackaged: false })).toBe(
      join('/repo/app', 'data', 'staging')
    )
    expect(PRODUCTION.dataDir({ ...base, isPackaged: false })).toBe(
      join('/repo/app', 'data', 'production')
    )
  })

  it('keeps data in the install folder on Windows', () => {
    const exePath = 'D:\\Apps\\MouseBucket\\MouseBucket.exe'
    expect(PRODUCTION.dataDir({ ...base, platform: 'win32', exePath })).toBe(
      'D:\\Apps\\MouseBucket\\data'
    )
  })

  it('keeps data next to an AppImage, per environment', () => {
    const appImagePath = '/home/me/Apps/MouseBucket-0.1.0.AppImage'
    expect(PRODUCTION.dataDir({ ...base, appImagePath })).toBe(
      '/home/me/Apps/MouseBucket-production-data'
    )
    expect(STAGING.dataDir({ ...base, appImagePath })).toBe(
      '/home/me/Apps/MouseBucket-staging-data'
    )
  })

  it("falls back to Electron's default folder for other packaged Linux builds", () => {
    expect(PRODUCTION.dataDir(base)).toBeNull()
  })
})

describe('hotReloadUrl', () => {
  const url = 'http://localhost:5173/'

  it('uses the hot-reload server in unpackaged staging runs', () => {
    expect(STAGING.hotReloadUrl(false, url)).toBe(url)
  })

  it('ignores it in production builds and packaged apps', () => {
    expect(PRODUCTION.hotReloadUrl(false, url)).toBeNull()
    expect(STAGING.hotReloadUrl(true, url)).toBeNull()
  })

  it('ignores anything that is not http on localhost', () => {
    expect(STAGING.hotReloadUrl(false, 'https://localhost:5173/')).toBeNull()
    expect(STAGING.hotReloadUrl(false, 'http://example.com/')).toBeNull()
    expect(STAGING.hotReloadUrl(false, 'http://127.0.0.1:5173/')).toBeNull()
    expect(STAGING.hotReloadUrl(false, undefined)).toBeNull()
  })
})
