import { readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import type { GoogleSignInService } from '../../../../src/main/services/google-sign-in-service'
import type { StorageService } from '../../../../src/main/services/storage-service'
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
const S3_KEYS = { platform: 's3', ...KEYS } as const
const NEW: NewTemplate = {
  name: 'Reports',
  kind: 'upload',
  platform: 's3',
  location: 's3://bucket-one/a/',
  keys: { source: 'entered', secrets: S3_KEYS }
}
const ACCOUNT_KEY = `${'A'.repeat(86)}==`
const NEW_AZURE: NewTemplate = {
  name: 'Backups',
  kind: 'upload',
  platform: 'azure',
  location: 'https://myaccount.blob.core.windows.net/backups/photos/',
  keys: { source: 'entered', secrets: { platform: 'azure', accountKey: ACCOUNT_KEY } }
}
const CLIENT = {
  clientId: '1234-abc.apps.googleusercontent.com',
  clientSecret: 'client-secret'
}
const NEW_DRIVE: NewTemplate = {
  name: 'Family',
  kind: 'download',
  platform: 'google-drive',
  location: 'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp',
  keys: { source: 'entered', secrets: { platform: 'google-drive', ...CLIENT } }
}

let dir: string
let resolve: Mock<StorageService['resolve']>
let signIn: Mock<GoogleSignInService['signIn']>
const service = (vault = fakeVault()): TemplateService =>
  new TemplateService(dir, vault, { resolve }, { signIn })

beforeEach(async () => {
  dir = await makeTempDir()
  // Answers as each platform would: S3 names the region, Google the folder's name.
  resolve = vi.fn<StorageService['resolve']>(async (location) => {
    if (location.platform === 's3') return { ...location, region: 'eu-west-1' }
    if (location.platform === 'azure') return location
    return { platform: 'google-drive', folderId: location.folderId, folderName: 'Photos' }
  })
  signIn = vi.fn<GoogleSignInService['signIn']>(async () => 'refresh-token')
})
afterEach(async () => {
  await removeTempDir(dir)
})

describe('TemplateService', () => {
  it('adds an S3 template at the bucket’s region, with its keys encrypted', async () => {
    const templates = service()
    const template = await templates.add(NEW)
    expect(template).toMatchObject({
      name: 'Reports',
      platform: 's3',
      bucket: 'bucket-one',
      prefix: 'a/',
      region: 'eu-west-1'
    })
    expect(resolve).toHaveBeenCalledWith(
      { platform: 's3', bucket: 'bucket-one', prefix: 'a/' },
      S3_KEYS
    )
    expect(await templates.list()).toEqual([template])
    expect(await templates.credentialsFor(template.id)).toEqual(S3_KEYS)
    const onDisk = await readFile(join(dir, 'credentials.bin'), 'utf8')
    expect(onDisk).not.toContain(KEYS.secretAccessKey)
    expect(await readFile(join(dir, 'templates.json'), 'utf8')).not.toContain(KEYS.accessKeyId)
  })

  it('adds an Azure template with its account key, checked against the container', async () => {
    const templates = service()
    const template = await templates.add(NEW_AZURE)
    expect(template).toMatchObject({
      platform: 'azure',
      account: 'myaccount',
      container: 'backups',
      prefix: 'photos/'
    })
    expect(await templates.accessFor(template)).toEqual({
      platform: 'azure',
      account: 'myaccount',
      container: 'backups',
      credentials: { platform: 'azure', accountKey: ACCOUNT_KEY }
    })
    expect(signIn).not.toHaveBeenCalled()
  })

  it('signs in to Google with the typed-in client, and keeps the folder’s name', async () => {
    const templates = service()
    const template = await templates.add(NEW_DRIVE)
    expect(signIn).toHaveBeenCalledWith(CLIENT.clientId, CLIENT.clientSecret)
    expect(template).toMatchObject({
      platform: 'google-drive',
      folderId: '1AbCdEfGhIjKlMnOp',
      folderName: 'Photos'
    })
    expect(await templates.credentialsFor(template.id)).toEqual({
      platform: 'google-drive',
      ...CLIENT,
      refreshToken: 'refresh-token'
    })
  })

  it('reads templates and keys saved without a platform as S3 ones', async () => {
    const id = '6f1c2b8e-4a3d-4f5e-9b7a-1c2d3e4f5a6b'
    const old = {
      id,
      name: 'Old',
      kind: 'upload',
      bucket: 'b-old',
      prefix: '',
      region: 'us-east-1'
    }
    await writeFile(join(dir, 'templates.json'), JSON.stringify([old]))
    await writeFile(
      join(dir, 'credentials.bin'),
      Buffer.from(JSON.stringify({ [id]: KEYS })).reverse()
    )
    const templates = service()
    expect(await templates.list()).toEqual([{ ...old, platform: 's3' }])
    expect(await templates.credentialsFor(id)).toEqual(S3_KEYS)
  })

  it('copies the keys of another template on the same platform without the page seeing them', async () => {
    const templates = service()
    const source = await templates.add(NEW)
    const copy = await templates.add({
      ...NEW,
      name: 'Archive',
      kind: 'download',
      location: 's3://bucket-two',
      keys: { source: 'copied', templateId: source.id }
    })
    expect(await templates.credentialsFor(copy.id)).toEqual(S3_KEYS)
    expect(await templates.accessFor(copy)).toEqual({
      platform: 's3',
      bucket: 'bucket-two',
      region: 'eu-west-1',
      credentials: S3_KEYS
    })
  })

  it('copies keys only from the same platform, and Azure keys only for the same account', async () => {
    const templates = service()
    const s3 = await templates.add(NEW)
    const azure = await templates.add(NEW_AZURE)
    await expect(
      templates.add({ ...NEW_AZURE, name: 'X', keys: { source: 'copied', templateId: s3.id } })
    ).rejects.toThrow('another platform')
    await expect(
      templates.add({
        ...NEW_AZURE,
        name: 'Y',
        location: 'https://otheraccount.blob.core.windows.net/backups',
        keys: { source: 'copied', templateId: azure.id }
      })
    ).rejects.toThrow('storage account "myaccount"')
  })

  it('rejects a bad location, and a folder for an S3 or Azure download template', async () => {
    const templates = service()
    await expect(templates.add({ ...NEW, location: 's3://Bad_Name' })).rejects.toThrow(
      'valid bucket name'
    )
    await expect(templates.add({ ...NEW, kind: 'download' })).rejects.toThrow('whole bucket')
    await expect(templates.add({ ...NEW_AZURE, kind: 'download' })).rejects.toThrow(
      'whole container'
    )
    expect(resolve).not.toHaveBeenCalled()
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

  it('refuses to store keys, or sign in, without OS encryption', async () => {
    const templates = service(fakeVault(false))
    await expect(templates.add(NEW)).rejects.toThrow("can't store keys securely")
    await expect(templates.add(NEW_DRIVE)).rejects.toThrow("can't store keys securely")
    expect(signIn).not.toHaveBeenCalled()
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
    await writeFile(path, Buffer.from(JSON.stringify({ [template.id]: S3_KEYS })).reverse())
    const before = (await stat(path)).mtimeMs
    await new Promise((done) => setTimeout(done, 20))
    const rotating = service(fakeVault(true, true))
    expect(await rotating.credentialsFor(template.id)).toEqual(S3_KEYS)
    expect((await stat(path)).mtimeMs).toBeGreaterThan(before)
  })

  it('renames a template, keeping its keys and region without asking the platform', async () => {
    const templates = service()
    const template = await templates.add(NEW)
    resolve.mockClear()
    const renamed = await templates.update({
      id: template.id,
      name: 'Monthly reports',
      kind: 'upload',
      platform: 's3',
      location: 's3://bucket-one/b/',
      keys: { source: 'kept' }
    })
    expect(renamed).toEqual({ ...template, name: 'Monthly reports', prefix: 'b/' })
    expect(resolve).not.toHaveBeenCalled()
    expect(await templates.list()).toEqual([renamed])
    expect(await templates.credentialsFor(template.id)).toEqual(S3_KEYS)
  })

  it('asks the platform again when the bucket or the keys change', async () => {
    const templates = service()
    const template = await templates.add(NEW)
    resolve.mockImplementation(async (location) => {
      if (location.platform !== 's3') throw new Error('Only S3 here.')
      return { ...location, region: 'eu-north-1' }
    })
    const moved = await templates.update({
      id: template.id,
      name: 'Reports',
      kind: 'download',
      platform: 's3',
      location: 's3://bucket-two',
      keys: { source: 'kept' }
    })
    expect(moved).toMatchObject({
      kind: 'download',
      bucket: 'bucket-two',
      prefix: '',
      region: 'eu-north-1'
    })
    expect(resolve).toHaveBeenLastCalledWith(
      { platform: 's3', bucket: 'bucket-two', prefix: '' },
      S3_KEYS
    )

    const newKeys = {
      platform: 's3',
      accessKeyId: 'AKIAEXAMPLEKEY000002',
      secretAccessKey: 'other'
    } as const
    await templates.update({
      id: template.id,
      name: 'Reports',
      kind: 'download',
      platform: 's3',
      location: 's3://bucket-two',
      keys: { source: 'entered', secrets: newKeys }
    })
    expect(resolve).toHaveBeenLastCalledWith(
      { platform: 's3', bucket: 'bucket-two', prefix: '' },
      newKeys
    )
    expect(await templates.credentialsFor(template.id)).toEqual(newKeys)
  })

  it('moves a template to another platform only with keys for it', async () => {
    const templates = service()
    const template = await templates.add(NEW)
    const toAzure = { ...NEW_AZURE, id: template.id, name: 'Reports' }
    await expect(templates.update({ ...toAzure, keys: { source: 'kept' } })).rejects.toThrow(
      'Enter keys for the new platform'
    )
    expect(await templates.update(toAzure)).toMatchObject({
      id: template.id,
      platform: 'azure',
      account: 'myaccount'
    })
    expect((await templates.credentialsFor(template.id)).platform).toBe('azure')
  })

  it("refuses another template's name, and new keys without OS encryption", async () => {
    const templates = service()
    const template = await templates.add(NEW)
    await templates.add({ ...NEW, name: 'Other' })
    const change = {
      id: template.id,
      kind: 'upload',
      platform: 's3',
      location: 's3://bucket-one/a/'
    } as const
    await expect(
      templates.update({ ...change, name: 'OTHER', keys: { source: 'kept' } })
    ).rejects.toThrow('already exists')
    const locked = service(fakeVault(false))
    await expect(
      locked.update({ ...change, name: 'Reports', keys: { source: 'entered', secrets: S3_KEYS } })
    ).rejects.toThrow("can't store keys securely")
    expect(
      await locked.update({ ...change, name: 'Renamed', keys: { source: 'kept' } })
    ).toMatchObject({ name: 'Renamed' })
  })
})
