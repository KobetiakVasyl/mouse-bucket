import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { DownloadService } from '../../../../src/main/services/download-service'
import type { S3Service } from '../../../../src/main/services/s3-service'
import type { BucketAccess } from '../../../../src/main/types/credential-types'
import type { NewTransferRecord } from '../../../../src/main/types/transfer-queue-types'
import type { Template } from '../../../../src/shared/types/template-types'
import { makeTempDir, removeTempDir } from '../../../support/temp-dir'

const TEMPLATE: Template = {
  id: '7d1c3f5e-1b2a-4c3d-8e9f-0a1b2c3d4e5f',
  name: 'Archive',
  kind: 'download',
  bucket: 'bucket-one',
  prefix: '',
  region: 'eu-west-1'
}
const ACCESS: BucketAccess = {
  bucket: 'bucket-one',
  region: 'eu-west-1',
  credentials: { accessKeyId: 'AKIAEXAMPLEKEY000001', secretAccessKey: 'secret' }
}

let dir: string
let queued: NewTransferRecord[]
let s3: {
  listFolder: Mock<S3Service['listFolder']>
  deleteFile: Mock<S3Service['deleteFile']>
  restoreFile: Mock<S3Service['restoreFile']>
}

// Every queued download counts as unfinished until the test removes it.
function service(downloadFolder = dir): DownloadService {
  return new DownloadService(
    { getOfKind: async () => TEMPLATE, accessFor: async () => ACCESS },
    s3,
    {
      add: (record) => {
        queued.push(record)
        return 'id'
      },
      downloadTargets: () =>
        queued.flatMap((record) => (record.kind === 'download' ? [record.targetPath] : []))
    },
    {
      get: async () => ({
        theme: 'dark',
        welcomeSeen: true,
        defaultStorageClass: 'DEEP_ARCHIVE',
        defaultRestoreTier: 'Bulk',
        defaultRestoreDays: 7,
        downloadFolder
      })
    }
  )
}

beforeEach(async () => {
  dir = await makeTempDir()
  queued = []
  s3 = {
    listFolder: vi.fn<S3Service['listFolder']>(async () => ({
      folders: [],
      files: [],
      nextToken: null
    })),
    deleteFile: vi.fn<S3Service['deleteFile']>(async () => undefined),
    restoreFile: vi.fn<S3Service['restoreFile']>(async () => undefined)
  }
})
afterEach(async () => {
  await removeTempDir(dir)
})

describe('DownloadService', () => {
  it('lists, deletes and restores in the template’s bucket', async () => {
    const downloads = service()
    const request = { templateId: TEMPLATE.id, key: 'a/b.zip' }
    await downloads.listFolder({ templateId: TEMPLATE.id, prefix: 'a/', continuationToken: null })
    await downloads.deleteFile(request)
    await downloads.restoreFile({ ...request, tier: 'Bulk', days: 3 })
    expect(s3.listFolder).toHaveBeenCalledWith(ACCESS, 'a/', null)
    expect(s3.deleteFile).toHaveBeenCalledWith(ACCESS, 'a/b.zip')
    expect(s3.restoreFile).toHaveBeenCalledWith(ACCESS, 'a/b.zip', 'Bulk', 3)
  })

  it('queues a download straight into the download folder under a safe name', async () => {
    const savedAs = await service().downloadFile({ templateId: TEMPLATE.id, key: 'a/b:c.zip' })
    expect(savedAs).toBe('b_c.zip')
    expect(queued).toEqual([
      {
        kind: 'download',
        templateId: TEMPLATE.id,
        templateName: 'Archive',
        bucket: 'bucket-one',
        region: 'eu-west-1',
        key: 'a/b:c.zip',
        name: 'b_c.zip',
        targetPath: join(dir, 'b_c.zip'),
        etag: null,
        bytesTotal: null
      }
    ])
  })

  it('numbers the name when a file, a partial download or an unfinished download has it', async () => {
    const downloads = service()
    const request = { templateId: TEMPLATE.id, key: 'reports/report.pdf' }
    await writeFile(join(dir, 'report.pdf'), 'old')
    await writeFile(join(dir, 'report (2).pdf.part'), 'half')
    expect(await downloads.downloadFile(request)).toBe('report (3).pdf')
    expect(await downloads.downloadFile(request)).toBe('report (4).pdf')
    queued.shift()
    expect(await downloads.downloadFile(request)).toBe('report (3).pdf')
  })

  it("refuses when the download folder doesn't exist", async () => {
    const missing = join(dir, 'gone')
    await expect(
      service(missing).downloadFile({ templateId: TEMPLATE.id, key: 'a.zip' })
    ).rejects.toThrow("doesn't exist anymore")
    expect(queued).toHaveLength(0)
  })
})
