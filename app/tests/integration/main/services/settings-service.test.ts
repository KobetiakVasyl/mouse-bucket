import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { WebContents } from 'electron'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SettingsService } from '../../../../src/main/services/settings-service'
import { makeTempDir, removeTempDir } from '../../../support/temp-dir'

const SENDER = {} as WebContents

let dir: string
let downloads: string
const service = (chosenFolder: string | null = null): SettingsService =>
  new SettingsService(join(dir, 'settings.json'), downloads, {
    chooseFolder: async () => chosenFolder
  })

beforeEach(async () => {
  dir = await makeTempDir()
  downloads = join(dir, 'Downloads')
})
afterEach(async () => {
  await removeTempDir(dir)
})

describe('SettingsService', () => {
  it("starts dark, uploading to Deep Archive and downloading to the system's Downloads", async () => {
    expect(await service().get()).toEqual({
      theme: 'dark',
      welcomeSeen: false,
      defaultStorageClass: 'DEEP_ARCHIVE',
      downloadFolder: downloads
    })
  })

  it('keeps updates across instances, and writes only what changed', async () => {
    await service().update({ theme: 'light' })
    await service().update({ welcomeSeen: true, defaultStorageClass: 'STANDARD' })
    expect(await service().get()).toEqual({
      theme: 'light',
      welcomeSeen: true,
      defaultStorageClass: 'STANDARD',
      downloadFolder: downloads
    })
    const onDisk: unknown = JSON.parse(await readFile(join(dir, 'settings.json'), 'utf8'))
    expect(onDisk).not.toHaveProperty('downloadFolder')
  })

  it('saves the folder chosen in the picker, and nothing when it was cancelled', async () => {
    const chosen = join(dir, 'Elsewhere')
    expect((await service(null).chooseDownloadFolder(SENDER)).downloadFolder).toBe(downloads)
    expect((await service(chosen).chooseDownloadFolder(SENDER)).downloadFolder).toBe(chosen)
    expect((await service().get()).downloadFolder).toBe(chosen)
  })

  it('fills in settings that an older settings.json lacks', async () => {
    const path = join(dir, 'settings.json')
    await writeFile(path, '{"theme":"light","welcomeSeen":true}')
    expect(await service().get()).toEqual({
      theme: 'light',
      welcomeSeen: true,
      defaultStorageClass: 'DEEP_ARCHIVE',
      downloadFolder: downloads
    })
  })

  it('falls back to the defaults for a damaged or invalid file', async () => {
    const path = join(dir, 'settings.json')
    const defaults = await service().get()
    await writeFile(path, '{broken')
    expect(await service().get()).toEqual(defaults)
    await writeFile(path, '{"theme":"purple"}')
    expect(await service().get()).toEqual(defaults)
    await writeFile(path, '{"downloadFolder":"relative/folder"}')
    expect(await service().get()).toEqual(defaults)
  })
})
