import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TransferStoreService } from '../../../../src/main/services/transfer-store-service'
import type { TransferRecord } from '../../../../src/main/types/transfer-queue-types'
import { makeTempDir, removeTempDir } from '../../../support/temp-dir'

let dir: string
beforeEach(async () => {
  dir = await makeTempDir()
})
afterEach(async () => {
  await removeTempDir(dir)
})

const record = (): TransferRecord => ({
  id: '11111111-2222-4333-8444-555555555555',
  templateId: '7d1c3f5e-1b2a-4c3d-8e9f-0a1b2c3d4e5f',
  templateName: 'Archive',
  bucket: 'bucket-one',
  region: 'eu-west-1',
  key: 'big.iso',
  name: 'big.iso',
  kind: 'download',
  targetPath: join(dir, 'big.iso'),
  etag: '"v1"',
  bytesTotal: 150_000_000_000
})

describe('TransferStoreService', () => {
  it('has nothing at first, then what was saved, whether saved at once or not', async () => {
    const store = new TransferStoreService(join(dir, 'transfers.json'))
    expect(await store.load()).toEqual([])
    await store.save([record()])
    expect(await store.load()).toEqual([record()])
    store.saveSync([])
    expect(await store.load()).toEqual([])
  })

  it('treats a damaged or invalid file as no transfers', async () => {
    const path = join(dir, 'transfers.json')
    await writeFile(path, '{broken')
    expect(await new TransferStoreService(path).load()).toEqual([])
    await writeFile(path, JSON.stringify([{ ...record(), targetPath: 'relative/big.iso' }]))
    expect(await new TransferStoreService(path).load()).toEqual([])
  })
})
