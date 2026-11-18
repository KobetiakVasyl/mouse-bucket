import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { makeTempDir, removeTempDir } from '../testing/temp-dir'
import { parseJson, readIfExists, serialize, writeAtomically } from './files'

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

describe('parseJson', () => {
  it('returns undefined for invalid JSON', () => {
    expect(parseJson('{"a":1}')).toEqual({ a: 1 })
    expect(parseJson('{broken')).toBeUndefined()
  })
})

describe('serialize', () => {
  it('runs tasks one after another, even when one fails', async () => {
    const run = serialize()
    const order: string[] = []
    const slow = run(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
      order.push('slow')
    })
    const failing = run(async () => {
      order.push('failing')
      throw new Error('x')
    })
    const last = run(async () => {
      order.push('last')
    })
    await Promise.allSettled([slow, failing, last])
    expect(order).toEqual(['slow', 'failing', 'last'])
    await expect(failing).rejects.toThrow('x')
  })
})
