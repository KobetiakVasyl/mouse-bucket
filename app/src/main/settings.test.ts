import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, SettingsStore } from './settings'
import { makeTempDir, removeTempDir } from './testing/temp-dir'

let dir: string
beforeEach(async () => {
  dir = await makeTempDir()
})
afterEach(async () => {
  await removeTempDir(dir)
})

describe('SettingsStore', () => {
  it('starts dark, with the welcome page not yet seen', async () => {
    expect(await new SettingsStore(join(dir, 'settings.json')).get()).toEqual({
      theme: 'dark',
      welcomeSeen: false
    })
  })

  it('keeps updates across instances', async () => {
    const path = join(dir, 'settings.json')
    await new SettingsStore(path).update({ theme: 'light' })
    await new SettingsStore(path).update({ welcomeSeen: true })
    expect(await new SettingsStore(path).get()).toEqual({ theme: 'light', welcomeSeen: true })
  })

  it('falls back to the defaults for a damaged or invalid file', async () => {
    const path = join(dir, 'settings.json')
    await writeFile(path, '{broken')
    expect(await new SettingsStore(path).get()).toEqual(DEFAULT_SETTINGS)
    await writeFile(path, '{"theme":"purple"}')
    expect(await new SettingsStore(path).get()).toEqual(DEFAULT_SETTINGS)
  })
})
