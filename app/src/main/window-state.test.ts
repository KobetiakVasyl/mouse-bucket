import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { makeTempDir, removeTempDir } from './testing/temp-dir'
import { windowPlacement, WindowStateStore } from './window-state'

const SCREEN = { x: 0, y: 0, width: 1920, height: 1040 }
const SAVED = { bounds: { x: 100, y: 80, width: 1000, height: 700 }, maximized: false }

describe('windowPlacement', () => {
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

describe('WindowStateStore', () => {
  let dir: string
  beforeEach(async () => {
    dir = await makeTempDir()
  })
  afterEach(async () => {
    await removeTempDir(dir)
  })

  it('has nothing saved at first, then what was saved', async () => {
    const store = new WindowStateStore(join(dir, 'window-state.json'))
    expect(await store.load()).toBeNull()
    store.saveSync(SAVED)
    expect(await store.load()).toEqual(SAVED)
  })

  it('treats a damaged file as nothing saved', async () => {
    const path = join(dir, 'window-state.json')
    await writeFile(path, '{"bounds":{"x":"left"}}')
    expect(await new WindowStateStore(path).load()).toBeNull()
  })
})
