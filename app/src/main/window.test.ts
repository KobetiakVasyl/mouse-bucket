import { describe, expect, it } from 'vitest'
import { type MainWindowInputs, mainWindowOptions } from './window'

describe('mainWindowOptions', () => {
  const base: MainWindowInputs = {
    environment: 'production',
    platform: 'win32',
    preloadPath: '/app/out/preload/index.js',
    icon: '/app/resources/icon.png'
  }

  it('hardens the window in both environments', () => {
    for (const environment of ['staging', 'production'] as const) {
      expect(mainWindowOptions({ ...base, environment }).webPreferences).toMatchObject({
        preload: base.preloadPath,
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        webSecurity: true
      })
    }
  })

  it('allows DevTools only in staging', () => {
    expect(mainWindowOptions({ ...base, environment: 'staging' }).webPreferences?.devTools).toBe(
      true
    )
    expect(mainWindowOptions(base).webPreferences?.devTools).toBe(false)
  })

  it('sets the window icon only on Linux', () => {
    expect(mainWindowOptions({ ...base, platform: 'linux' }).icon).toBe(base.icon)
    expect(mainWindowOptions(base).icon).toBeUndefined()
  })
})
