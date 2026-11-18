import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readIfExists, writeAtomically } from '../../../../src/main/utils/file-utils'
import { makeTempDir, removeTempDir } from '../../../support/temp-dir'

let dir: string
beforeEach(async () => {
  dir = await makeTempDir()
})
afterEach(async () => {
  await removeTempDir(dir)
})

describe('readIfExists and writeAtomically', () => {
  it('reads nothing before the first write, then what was written', async () => {
    const path = join(dir, 'nested', 'file.txt')
    expect(await readIfExists(path)).toBeUndefined()
    await writeAtomically(path, 'one')
    await writeAtomically(path, 'two')
    expect((await readFile(path)).toString()).toBe('two')
  })
})
