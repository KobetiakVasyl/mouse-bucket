import { readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TemplateService } from '../../../../src/main/services/template-service'
import type { KeyVault } from '../../../../src/main/types/key-vault-types'
import type { NewTemplate } from '../../../../src/shared/types/template-types'
import { makeTempDir, removeTempDir } from '../../../support/temp-dir'

// Reverses the bytes, so the test can tell encrypted data from plain JSON.
const fakeVault = (available = true, shouldReEncrypt = false): KeyVault => ({
  available: async () => available,
  encrypt: async (text) => Buffer.from(text).reverse(),
  decrypt: async (data) => ({ text: Buffer.from(data).reverse().toString(), shouldReEncrypt })
})

const KEYS = { accessKeyId: 'AKIAEXAMPLEKEY000001', secretAccessKey: 'secret/value' }
const NEW: NewTemplate = {
  name: 'Reports',
  kind: 'upload',
  location: 's3://bucket-one/a/',
  keys: { source: 'entered', ...KEYS }
}

let dir: string
let findRegion: ReturnType<typeof vi.fn<(credentials: unknown, bucket: string) => Promise<string>>>
const service = (vault = fakeVault()): TemplateService =>
  new TemplateService(dir, vault, { findRegion })

beforeEach(async () => {
  dir = await makeTempDir()
  findRegion = vi.fn(async () => 'eu-west-1')
})
afterEach(async () => {
  await removeTempDir(dir)
})

describe('TemplateService', () => {
  it('adds a template at the bucket’s region, with its keys encrypted', async () => {
    const templates = service()
    const template = await templates.add(NEW)
    expect(template).toMatchObject({ name: 'Reports', bucket: 'bucket-one', prefix: 'a/' })
    expect(template.region).toBe('eu-west-1')
    expect(findRegion).toHaveBeenCalledWith(KEYS, 'bucket-one')
    expect(await templates.list()).toEqual([template])
    expect(await templates.credentialsFor(template.id)).toEqual(KEYS)
    const onDisk = await readFile(join(dir, 'credentials.bin'), 'utf8')
    expect(onDisk).not.toContain(KEYS.secretAccessKey)
    expect(await readFile(join(dir, 'templates.json'), 'utf8')).not.toContain(KEYS.accessKeyId)
  })

  it('copies the keys of another template without the page seeing them', async () => {
    const templates = service()
    const source = await templates.add(NEW)
    const copy = await templates.add({
      ...NEW,
      name: 'Archive',
      kind: 'download',
      location: 's3://bucket-two',
      keys: { source: 'copied', templateId: source.id }
    })
    expect(await templates.credentialsFor(copy.id)).toEqual(KEYS)
    expect(await templates.accessFor(copy)).toEqual({
      bucket: 'bucket-two',
      region: 'eu-west-1',
      credentials: KEYS
    })
  })

  it('rejects a bad location, and a folder for a download template', async () => {
    const templates = service()
    await expect(templates.add({ ...NEW, location: 's3://Bad_Name' })).rejects.toThrow(
      'valid bucket name'
    )
    await expect(templates.add({ ...NEW, kind: 'download' })).rejects.toThrow('whole bucket')
    expect(findRegion).not.toHaveBeenCalled()
  })

  it('rejects a second template with the same name, in any case', async () => {
    const templates = service()
    await templates.add(NEW)
    await expect(templates.add({ ...NEW, name: 'REPORTS' })).rejects.toThrow('already exists')
  })

  it('finds a template only as the kind it is', async () => {
    const templates = service()
    const template = await templates.add(NEW)
    expect(await templates.getOfKind(template.id, 'upload')).toEqual(template)
    await expect(templates.getOfKind(template.id, 'download')).rejects.toThrow(
      `"Reports" isn't a download template.`
    )
  })

  it('deletes a template together with its keys', async () => {
    const templates = service()
    const kept = await templates.add(NEW)
    const removed = await templates.add({ ...NEW, name: 'Other' })
    await templates.delete(removed.id)
    expect(await templates.list()).toEqual([kept])
    await expect(templates.credentialsFor(removed.id)).rejects.toThrow('keys for this template')
  })

  it('refuses to store keys without OS encryption', async () => {
    const templates = service(fakeVault(false))
    await expect(templates.add(NEW)).rejects.toThrow("can't store keys securely")
    expect(await templates.list()).toEqual([])
  })

  it('reports damaged files instead of failing obscurely', async () => {
    await writeFile(join(dir, 'templates.json'), '{broken')
    await expect(service().list()).rejects.toThrow('saved templates are damaged')
  })

  it("reports keys that this account can't decrypt", async () => {
    const template = await service().add(NEW)
    const failing: KeyVault = {
      ...fakeVault(),
      decrypt: async () => {
        throw new Error('decrypt failed')
      }
    }
    await expect(service(failing).credentialsFor(template.id)).rejects.toThrow("can't be decrypted")
  })

  it('saves the keys again when the OS rotated its key', async () => {
    const template = await service().add(NEW)
    const path = join(dir, 'credentials.bin')
    await writeFile(path, Buffer.from(JSON.stringify({ [template.id]: KEYS })).reverse())
    const before = (await stat(path)).mtimeMs
    await new Promise((resolve) => setTimeout(resolve, 20))
    const rotating = service(fakeVault(true, true))
    expect(await rotating.credentialsFor(template.id)).toEqual(KEYS)
    expect((await stat(path)).mtimeMs).toBeGreaterThan(before)
  })
})
