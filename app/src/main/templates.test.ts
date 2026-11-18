import { readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { KeyVault } from './key-vault'
import { TemplateStore } from './templates'
import { makeTempDir, removeTempDir } from './testing/temp-dir'

// Reverses the bytes, so the test can tell encrypted data from plain JSON.
const fakeVault = (available = true, shouldReEncrypt = false): KeyVault => ({
  available: async () => available,
  encrypt: async (text) => Buffer.from(text).reverse(),
  decrypt: async (data) => ({ text: Buffer.from(data).reverse().toString(), shouldReEncrypt })
})

const KEYS = { accessKeyId: 'AKIAEXAMPLEKEY000001', secretAccessKey: 'secret/value' }
const DETAILS = {
  name: 'Reports',
  kind: 'upload',
  bucket: 'b1',
  prefix: 'a/',
  region: 'eu-west-1'
} as const

let dir: string
beforeEach(async () => {
  dir = await makeTempDir()
})
afterEach(async () => {
  await removeTempDir(dir)
})

describe('TemplateStore', () => {
  it('stores a template and its keys, with the keys encrypted', async () => {
    const store = new TemplateStore(dir, fakeVault())
    const template = await store.create(DETAILS, KEYS)
    expect(await store.list()).toEqual([template])
    expect(await store.credentialsFor(template.id)).toEqual(KEYS)
    const onDisk = await readFile(join(dir, 'credentials.bin'), 'utf8')
    expect(onDisk).not.toContain(KEYS.secretAccessKey)
    expect(await readFile(join(dir, 'templates.json'), 'utf8')).not.toContain(KEYS.accessKeyId)
  })

  it('rejects a second template with the same name, in any case', async () => {
    const store = new TemplateStore(dir, fakeVault())
    await store.create(DETAILS, KEYS)
    await expect(store.create({ ...DETAILS, name: 'REPORTS' }, KEYS)).rejects.toThrow(
      'already exists'
    )
  })

  it('deletes a template together with its keys', async () => {
    const store = new TemplateStore(dir, fakeVault())
    const kept = await store.create(DETAILS, KEYS)
    const removed = await store.create({ ...DETAILS, name: 'Other' }, KEYS)
    await store.delete(removed.id)
    expect(await store.list()).toEqual([kept])
    await expect(store.credentialsFor(removed.id)).rejects.toThrow('keys for this template')
  })

  it('refuses to store keys without OS encryption', async () => {
    const store = new TemplateStore(dir, fakeVault(false))
    await expect(store.create(DETAILS, KEYS)).rejects.toThrow("can't store keys securely")
    expect(await store.list()).toEqual([])
  })

  it('reports damaged files instead of failing obscurely', async () => {
    const store = new TemplateStore(dir, fakeVault())
    await writeFile(join(dir, 'templates.json'), '{broken')
    await expect(store.list()).rejects.toThrow('saved templates are damaged')
  })

  it("reports keys that this account can't decrypt", async () => {
    const store = new TemplateStore(dir, fakeVault())
    const template = await store.create(DETAILS, KEYS)
    const failing: KeyVault = {
      ...fakeVault(),
      decrypt: async () => {
        throw new Error('decrypt failed')
      }
    }
    await expect(new TemplateStore(dir, failing).credentialsFor(template.id)).rejects.toThrow(
      "can't be decrypted"
    )
  })

  it('saves the keys again when the OS rotated its key', async () => {
    const template = await new TemplateStore(dir, fakeVault()).create(DETAILS, KEYS)
    const path = join(dir, 'credentials.bin')
    await writeFile(path, Buffer.from(JSON.stringify({ [template.id]: KEYS })).reverse())
    const before = (await stat(path)).mtimeMs
    await new Promise((resolve) => setTimeout(resolve, 20))
    const rotating = new TemplateStore(dir, fakeVault(true, true))
    expect(await rotating.credentialsFor(template.id)).toEqual(KEYS)
    expect((await stat(path)).mtimeMs).toBeGreaterThan(before)
  })
})
