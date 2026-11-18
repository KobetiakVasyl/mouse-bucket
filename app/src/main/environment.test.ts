import { describe, expect, it } from 'vitest'
import { join } from 'path'
import {
  appDataDir,
  appId,
  type DataDirInputs,
  devToolsAllowed,
  environmentFromMode,
  hotReloadUrl,
  productName,
  windowTitle
} from './environment'

describe('environmentFromMode', () => {
  it('accepts the two build modes', () => {
    expect(environmentFromMode('staging')).toBe('staging')
    expect(environmentFromMode('production')).toBe('production')
  })

  it('rejects any other mode', () => {
    expect(() => environmentFromMode('development')).toThrow('Unknown build mode "development"')
  })
})

describe('productName and appId', () => {
  it('uses the production identity in production', () => {
    expect(productName('production')).toBe('MouseBucket')
    expect(appId('production')).toBe('io.github.kobetiakvasyl.mousebucket')
  })

  it('gives staging its own identity', () => {
    expect(productName('staging')).toBe('MouseBucket Staging')
    expect(appId('staging')).toBe('io.github.kobetiakvasyl.mousebucket.staging')
  })
})

describe('windowTitle', () => {
  it('marks staging', () => {
    expect(windowTitle('staging')).toBe('MouseBucket STAGING')
  })

  it('leaves production unmarked', () => {
    expect(windowTitle('production')).toBe('MouseBucket')
  })
})

describe('devToolsAllowed', () => {
  it('allows DevTools only in staging', () => {
    expect(devToolsAllowed('staging')).toBe(true)
    expect(devToolsAllowed('production')).toBe(false)
  })
})

describe('appDataDir', () => {
  const base: DataDirInputs = {
    environment: 'production',
    isPackaged: true,
    appPath: '/repo/app',
    platform: 'linux',
    exePath: '/opt/MouseBucket/MouseBucket',
    appImagePath: undefined
  }

  it('keeps data in the app folder, per environment, when running from source', () => {
    expect(appDataDir({ ...base, isPackaged: false, environment: 'staging' })).toBe(
      join('/repo/app', 'data', 'staging')
    )
    expect(appDataDir({ ...base, isPackaged: false })).toBe(join('/repo/app', 'data', 'production'))
  })

  it('keeps data in the install folder on Windows', () => {
    const exePath = 'D:\\Apps\\MouseBucket\\MouseBucket.exe'
    expect(appDataDir({ ...base, platform: 'win32', exePath })).toBe('D:\\Apps\\MouseBucket\\data')
  })

  it('keeps data next to an AppImage, per environment', () => {
    const appImagePath = '/home/me/Apps/MouseBucket-0.1.0.AppImage'
    expect(appDataDir({ ...base, appImagePath })).toBe('/home/me/Apps/MouseBucket-production-data')
    expect(appDataDir({ ...base, environment: 'staging', appImagePath })).toBe(
      '/home/me/Apps/MouseBucket-staging-data'
    )
  })

  it("falls back to Electron's default folder for other packaged Linux builds", () => {
    expect(appDataDir(base)).toBeNull()
  })
})

describe('hotReloadUrl', () => {
  const url = 'http://localhost:5173/'

  it('uses the hot-reload server in unpackaged staging runs', () => {
    expect(hotReloadUrl('staging', false, url)).toBe(url)
  })

  it('ignores it in production builds and packaged apps', () => {
    expect(hotReloadUrl('production', false, url)).toBeNull()
    expect(hotReloadUrl('staging', true, url)).toBeNull()
  })

  it('ignores anything that is not http on localhost', () => {
    expect(hotReloadUrl('staging', false, 'https://localhost:5173/')).toBeNull()
    expect(hotReloadUrl('staging', false, 'http://example.com/')).toBeNull()
    expect(hotReloadUrl('staging', false, 'http://127.0.0.1:5173/')).toBeNull()
    expect(hotReloadUrl('staging', false, undefined)).toBeNull()
  })
})
