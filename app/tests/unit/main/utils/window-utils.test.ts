import { describe, expect, it } from 'vitest'
import { EnvironmentService } from '../../../../src/main/services/environment-service'
import type { MainWindowInputs } from '../../../../src/main/types/window-types'
import { mainWindowOptions, windowPlacement } from '../../../../src/main/utils/window-utils'
import { PAPER } from '../../../../src/main/constants/theme-constants'

describe('mainWindowOptions', () => {
  const base: MainWindowInputs = {
    environment: new EnvironmentService('production'),
    platform: 'win32',
    preloadPath: '/app/out/preload/index.js',
    icon: '/app/resources/icon.png',
    theme: 'dark',
    bounds: null
  }
  const staging = new EnvironmentService('staging')

  it('hardens the window in both environments', () => {
    for (const environment of [staging, base.environment]) {
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
    expect(mainWindowOptions({ ...base, environment: staging })).toMatchObject({
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

describe('windowPlacement', () => {
  const SCREEN = { x: 0, y: 0, width: 1920, height: 1040 }
  const SAVED = { bounds: { x: 100, y: 80, width: 1000, height: 700 }, maximized: false }

  it('opens maximized the first time', () => {
    expect(windowPlacement(null, [SCREEN])).toEqual({ bounds: null, maximized: true })
  })

  it('reopens where the window was', () => {
    expect(windowPlacement(SAVED, [SCREEN])).toEqual(SAVED)
    expect(windowPlacement({ ...SAVED, maximized: true }, [SCREEN])).toEqual({
      ...SAVED,
      maximized: true
    })
  })

  it('opens maximized when the saved place is off every screen', () => {
    const offScreen = { ...SAVED, bounds: { x: 3000, y: 80, width: 1000, height: 700 } }
    expect(windowPlacement(offScreen, [SCREEN])).toEqual({ bounds: null, maximized: true })
    const second = { x: 1920, y: 0, width: 1920, height: 1040 }
    expect(windowPlacement(offScreen, [SCREEN, second])).toEqual(offScreen)
  })
})
