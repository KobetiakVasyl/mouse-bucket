import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../../../../src/main/constants/settings-constants'
import { SettingsService } from '../../../../src/main/services/settings-service'
import { makeTempDir, removeTempDir } from '../../../support/temp-dir'

let dir: string
beforeEach(async () => {
  dir = await makeTempDir()
})
afterEach(async () => {
  await removeTempDir(dir)
})

describe('SettingsService', () => {
  it('starts dark, with the welcome page not yet seen', async () => {
    expect(await new SettingsService(join(dir, 'settings.json')).get()).toEqual({
      theme: 'dark',
      welcomeSeen: false
    })
  })

  it('keeps updates across instances', async () => {
    const path = join(dir, 'settings.json')
    await new SettingsService(path).update({ theme: 'light' })
    await new SettingsService(path).update({ welcomeSeen: true })
    expect(await new SettingsService(path).get()).toEqual({ theme: 'light', welcomeSeen: true })
  })

  it('falls back to the defaults for a damaged or invalid file', async () => {
    const path = join(dir, 'settings.json')
    await writeFile(path, '{broken')
    expect(await new SettingsService(path).get()).toEqual(DEFAULT_SETTINGS)
    await writeFile(path, '{"theme":"purple"}')
    expect(await new SettingsService(path).get()).toEqual(DEFAULT_SETTINGS)
  })
})
