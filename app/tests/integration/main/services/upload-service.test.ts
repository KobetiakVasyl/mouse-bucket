import { mkdir, stat, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { WebContents } from 'electron'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { UploadService } from '../../../../src/main/services/upload-service'
import type { NewTransferRecord } from '../../../../src/main/types/transfer-queue-types'
import type { Template } from '../../../../src/shared/types/template-types'
import { makeTempDir, removeTempDir } from '../../../support/temp-dir'

const TEMPLATE: Template = {
  id: '7d1c3f5e-1b2a-4c3d-8e9f-0a1b2c3d4e5f',
  name: 'Reports',
  kind: 'upload',
  bucket: 'bucket-one',
  prefix: 'reports/',
  region: 'eu-west-1'
}
const SENDER = {} as WebContents
const REQUEST = { templateId: TEMPLATE.id, storageClass: 'STANDARD' } as const

let dir: string
let queued: NewTransferRecord[]
function service(picked: { files?: string[]; folder?: string | null } = {}): UploadService {
  return new UploadService(
    { getOfKind: async () => TEMPLATE },
    {
      add: (record) => {
        queued.push(record)
        return 'id'
      }
    },
    {
      chooseFiles: async () => (picked.files === undefined ? [] : picked.files),
      chooseFolder: async () => (picked.folder === undefined ? null : picked.folder)
    }
  )
}
const keys = (): string[] => queued.map((record) => record.key)

beforeEach(async () => {
  dir = await makeTempDir()
  queued = []
  await mkdir(join(dir, 'Photos', '2026'), { recursive: true })
  await writeFile(join(dir, 'report.pdf'), 'report')
  await writeFile(join(dir, 'Photos', 'beach.jpg'), 'beach')
  await writeFile(join(dir, 'Photos', '2026', 'snow.jpg'), 'snow')
})
afterEach(async () => {
  await removeTempDir(dir)
})

describe('UploadService', () => {
  it('queues each picked file under the template’s folder, keeping its name', async () => {
    const file = join(dir, 'report.pdf')
    const info = await stat(file)
    expect(await service({ files: [file] }).chooseFiles(REQUEST, SENDER)).toBe(1)
    expect(queued).toEqual([
      {
        kind: 'upload',
        templateId: TEMPLATE.id,
        templateName: 'Reports',
        bucket: 'bucket-one',
        region: 'eu-west-1',
        key: 'reports/report.pdf',
        name: 'report.pdf',
        storageClass: 'STANDARD',
        filePath: file,
        fileSize: info.size,
        fileModifiedMs: info.mtimeMs,
        partSize: 8 * 1024 * 1024,
        uploadId: null,
        parts: []
      }
    ])
  })

  it('queues every file of a picked folder, keeping the folder’s name and its paths', async () => {
    const photos = join(dir, 'Photos')
    expect(await service({ folder: photos }).chooseFolder(REQUEST, SENDER)).toBe(2)
    expect(keys()).toEqual(['reports/Photos/2026/snow.jpg', 'reports/Photos/beach.jpg'])
    expect(queued.map((record) => record.name)).toEqual([
      'Photos/2026/snow.jpg',
      'Photos/beach.jpg'
    ])
  })

  it('skips links inside a folder', async () => {
    const linked = await symlink(join(dir, 'report.pdf'), join(dir, 'Photos', 'link.pdf')).then(
      () => true,
      () => false
    )
    await service({ folder: join(dir, 'Photos') }).chooseFolder(REQUEST, SENDER)
    if (linked) expect(keys()).not.toContain('reports/Photos/link.pdf')
    expect(keys()).toHaveLength(2)
  })

  it('queues dropped files and folders, ignoring paths that are relative or gone', async () => {
    const paths = [join(dir, 'report.pdf'), join(dir, 'Photos'), 'report.pdf', join(dir, 'gone')]
    expect(await service().uploadPaths({ ...REQUEST, paths })).toBe(3)
    expect(keys()).toEqual([
      'reports/report.pdf',
      'reports/Photos/2026/snow.jpg',
      'reports/Photos/beach.jpg'
    ])
  })

  it('queues nothing when a picker is cancelled', async () => {
    expect(await service().chooseFiles(REQUEST, SENDER)).toBe(0)
    expect(await service({ folder: null }).chooseFolder(REQUEST, SENDER)).toBe(0)
    expect(queued).toEqual([])
  })
})
