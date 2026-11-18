import { describe, expect, it } from 'vitest'
import { PAPER } from '../shared/theme'
import { type MainWindowInputs, mainWindowOptions } from './window'

describe('mainWindowOptions', () => {
  const base: MainWindowInputs = {
    environment: 'production',
    platform: 'win32',
    preloadPath: '/app/out/preload/index.js',
    icon: '/app/resources/icon.png',
    theme: 'dark',
    bounds: null
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
    expect(mainWindowOptions({ ...base, environment: 'staging' })).toMatchObject({
      webPreferences: { devTools: true }
    })
    expect(mainWindowOptions(base)).toMatchObject({ webPreferences: { devTools: false } })
  })

  it('sets the window icon only on Linux', () => {
    expect(mainWindowOptions({ ...base, platform: 'linux' }).icon).toBe(base.icon)
    expect(mainWindowOptions(base).icon).toBeUndefined()
  })

  it('paints the background in the theme’s color before the page loads', () => {
    expect(mainWindowOptions(base).backgroundColor).toBe(PAPER.dark)
    expect(mainWindowOptions({ ...base, theme: 'light' }).backgroundColor).toBe(PAPER.light)
  })

  it('opens at the saved place, or at the default size', () => {
    const bounds = { x: 10, y: 20, width: 800, height: 600 }
    expect(mainWindowOptions({ ...base, bounds })).toMatchObject(bounds)
    expect(mainWindowOptions(base)).toMatchObject({ width: 1000, height: 700 })
    expect(mainWindowOptions(base)).not.toHaveProperty('x')
  })
})
