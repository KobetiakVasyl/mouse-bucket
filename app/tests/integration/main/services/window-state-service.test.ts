import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { WindowStateService } from '../../../../src/main/services/window-state-service'
import { makeTempDir, removeTempDir } from '../../../support/temp-dir'

const SAVED = { bounds: { x: 100, y: 80, width: 1000, height: 700 }, maximized: false }

let dir: string
beforeEach(async () => {
  dir = await makeTempDir()
})
afterEach(async () => {
  await removeTempDir(dir)
})

describe('WindowStateService', () => {
  it('has nothing saved at first, then what was saved', async () => {
    const store = new WindowStateService(join(dir, 'window-state.json'))
    expect(await store.load()).toBeNull()
    store.saveSync(SAVED)
    expect(await store.load()).toEqual(SAVED)
  })

  it('treats a damaged file as nothing saved', async () => {
    const path = join(dir, 'window-state.json')
    await writeFile(path, '{"bounds":{"x":"left"}}')
    expect(await new WindowStateService(path).load()).toBeNull()
  })
})
