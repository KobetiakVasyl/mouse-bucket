import { join } from 'node:path'
import type { WebContents } from 'electron'
import { describe, expect, it, vi } from 'vitest'
import { DownloadService } from '../../../../src/main/services/download-service'
import type { BucketAccess } from '../../../../src/main/types/credential-types'
import type { TransferTask } from '../../../../src/main/types/transfer-queue-types'
import type { Template } from '../../../../src/shared/types/template-types'

const TEMPLATE: Template = {
  id: '7d1c3f5e-1b2a-4c3d-8e9f-0a1b2c3d4e5f',
  name: 'Archive',
  kind: 'download',
  bucket: 'b1',
  prefix: '',
  region: 'eu-west-1'
}
const ACCESS: BucketAccess = {
  bucket: 'b1',
  region: 'eu-west-1',
  credentials: { accessKeyId: 'AKIAEXAMPLEKEY000001', secretAccessKey: 'secret' }
}
const SENDER = {} as WebContents
const DOWNLOADS = join('/home', 'me', 'Downloads')

function setup(savePath: string | null): {
  service: DownloadService
  s3: {
    listFolder: ReturnType<typeof vi.fn>
    downloadFile: ReturnType<typeof vi.fn>
    deleteFile: ReturnType<typeof vi.fn>
    restoreFile: ReturnType<typeof vi.fn>
  }
  chooseSavePath: ReturnType<typeof vi.fn>
  tasks: TransferTask[]
} {
  const s3 = {
    listFolder: vi.fn(async () => ({ folders: [], files: [], nextToken: null })),
    downloadFile: vi.fn(async () => undefined),
    deleteFile: vi.fn(async () => undefined),
    restoreFile: vi.fn(async () => undefined)
  }
  const chooseSavePath = vi.fn(async () => savePath)
  const tasks: TransferTask[] = []
  const service = new DownloadService(
    { getOfKind: async () => TEMPLATE, accessFor: async () => ACCESS },
    s3,
    {
      add: (_details, task) => {
        tasks.push(task)
        return 'id'
      }
    },
    { chooseSavePath },
    () => DOWNLOADS
  )
  return { service, s3, chooseSavePath, tasks }
}

describe('DownloadService', () => {
  it('lists, deletes and restores in the template’s bucket', async () => {
    const { service, s3 } = setup(null)
    const request = { templateId: TEMPLATE.id, key: 'a/b.zip' }
    await service.listFolder({ templateId: TEMPLATE.id, prefix: 'a/', continuationToken: null })
    await service.deleteFile(request)
    await service.restoreFile({ ...request, tier: 'Bulk', days: 3 })
    expect(s3.listFolder).toHaveBeenCalledWith(ACCESS, 'a/', null)
    expect(s3.deleteFile).toHaveBeenCalledWith(ACCESS, 'a/b.zip')
    expect(s3.restoreFile).toHaveBeenCalledWith(ACCESS, 'a/b.zip', 'Bulk', 3)
  })

  it('offers a safe name in the Downloads folder and queues the chosen path', async () => {
    const target = join(DOWNLOADS, 'b.zip')
    const { service, s3, chooseSavePath, tasks } = setup(target)
    expect(await service.downloadFile({ templateId: TEMPLATE.id, key: 'a/b:c.zip' }, SENDER)).toBe(
      true
    )
    expect(chooseSavePath).toHaveBeenCalledWith(
      SENDER,
      expect.any(String),
      join(DOWNLOADS, 'b_c.zip')
    )
    await tasks[0]({ signal: new AbortController().signal, progress: () => undefined })
    expect(s3.downloadFile).toHaveBeenCalledWith(
      ACCESS,
      expect.objectContaining({ key: 'a/b:c.zip', targetPath: target })
    )
  })

  it('queues nothing when the Save dialog is cancelled', async () => {
    const { service, tasks } = setup(null)
    expect(await service.downloadFile({ templateId: TEMPLATE.id, key: 'a.zip' }, SENDER)).toBe(
      false
    )
    expect(tasks).toHaveLength(0)
  })
})
