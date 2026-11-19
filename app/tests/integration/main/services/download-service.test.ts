import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { DownloadService } from '../../../../src/main/services/download-service'
import type { StorageService } from '../../../../src/main/services/storage-service'
import type { S3Access } from '../../../../src/main/types/credential-types'
import type { TreeFile } from '../../../../src/main/types/storage-service-types'
import type { NewTransferRecord } from '../../../../src/main/types/transfer-queue-types'
import type { Template } from '../../../../src/shared/types/template-types'
import { makeTempDir, removeTempDir } from '../../../support/temp-dir'

const TEMPLATE: Template = {
  id: '7d1c3f5e-1b2a-4c3d-8e9f-0a1b2c3d4e5f',
  name: 'Archive',
  kind: 'download',
  platform: 's3',
  bucket: 'bucket-one',
  prefix: '',
  region: 'eu-west-1'
}
const ACCESS: S3Access = {
  platform: 's3',
  bucket: 'bucket-one',
  region: 'eu-west-1',
  credentials: { platform: 's3', accessKeyId: 'AKIAEXAMPLEKEY000001', secretAccessKey: 'secret' }
}

let dir: string
let queued: NewTransferRecord[]
let storage: {
  listFolder: Mock<StorageService['listFolder']>
  deleteFile: Mock<StorageService['deleteFile']>
  restoreFile: Mock<StorageService['restoreFile']>
  fileName: Mock<StorageService['fileName']>
  folderFiles: Mock<StorageService['folderFiles']>
  folderName: Mock<StorageService['folderName']>
  deleteFolder: Mock<StorageService['deleteFolder']>
  summarizeFolder: Mock<StorageService['summarizeFolder']>
  restoreFolder: Mock<StorageService['restoreFolder']>
}

// Every queued download counts as unfinished until the test removes it.
function service(downloadFolder = dir): DownloadService {
  return new DownloadService(
    { getOfKind: async () => TEMPLATE, accessFor: async () => ACCESS },
    storage,
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
        defaultAccessTier: 'Archive',
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
  storage = {
    listFolder: vi.fn<StorageService['listFolder']>(async () => ({
      folders: [],
      files: [],
      nextToken: null
    })),
    deleteFile: vi.fn<StorageService['deleteFile']>(async () => undefined),
    restoreFile: vi.fn<StorageService['restoreFile']>(async () => undefined),
    fileName: vi.fn<StorageService['fileName']>(async (_access, key) => key),
    folderFiles: vi.fn<StorageService['folderFiles']>(async () => []),
    folderName: vi.fn<StorageService['folderName']>(async () => 'photos'),
    deleteFolder: vi.fn<StorageService['deleteFolder']>(async () => undefined),
    summarizeFolder: vi.fn<StorageService['summarizeFolder']>(async () => ({
      files: 2,
      bytes: 10,
      archived: 1
    })),
    restoreFolder: vi.fn<StorageService['restoreFolder']>(async () => 1)
  }
})
afterEach(async () => {
  await removeTempDir(dir)
})

describe('DownloadService', () => {
  it('lists, deletes and restores in the template’s bucket', async () => {
    const downloads = service()
    const request = { templateId: TEMPLATE.id, key: 'a/b.zip' }
    const options = { platform: 's3', tier: 'Bulk', days: 3 } as const
    await downloads.listFolder({ templateId: TEMPLATE.id, folder: 'a/', continuationToken: null })
    await downloads.deleteFile(request)
    await downloads.restoreFile({ ...request, options })
    expect(storage.listFolder).toHaveBeenCalledWith(ACCESS, 'a/', null)
    expect(storage.deleteFile).toHaveBeenCalledWith(ACCESS, 'a/b.zip')
    expect(storage.restoreFile).toHaveBeenCalledWith(ACCESS, 'a/b.zip', options)
  })

  it('saves under the name the platform gives the file, such as a Google Drive file by its ID', async () => {
    storage.fileName.mockResolvedValue('Holiday: 2025.jpg')
    const savedAs = await service().downloadFile({ templateId: TEMPLATE.id, key: 'drive-file-1' })
    expect(savedAs).toBe('Holiday_ 2025.jpg')
    expect(storage.fileName).toHaveBeenCalledWith(ACCESS, 'drive-file-1')
  })

  it('queues a download straight into the download folder under a safe name', async () => {
    const savedAs = await service().downloadFile({ templateId: TEMPLATE.id, key: 'a/b:c.zip' })
    expect(savedAs).toBe('b_c.zip')
    expect(queued).toEqual([
      {
        kind: 'download',
        templateId: TEMPLATE.id,
        templateName: 'Archive',
        place: { platform: 's3', bucket: 'bucket-one', region: 'eu-west-1' },
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

  describe('whole folders', () => {
    const treeFile = (
      key: string,
      path: string,
      state: 'available' | 'archived' = 'available'
    ): TreeFile => ({
      key,
      name: path,
      path,
      size: 5,
      lastModified: '2026-11-01T09:30:00.000Z',
      storageClass: 'STANDARD',
      access: { state }
    })
    const request = { templateId: TEMPLATE.id, folder: 'photos/' }

    it('downloads a folder into one of its name, keeping the folders inside and skipping archived files', async () => {
      storage.folderFiles.mockResolvedValue([
        treeFile('photos/beach.jpg', 'beach.jpg'),
        treeFile('photos/2025/snow.jpg', '2025/snow.jpg'),
        treeFile('photos/old.zip', 'old.zip', 'archived')
      ])
      const result = await service().downloadFolder(request)
      expect(result).toEqual({ queued: 2, skipped: 1, savedAs: 'photos' })
      expect(queued.map((record) => record.kind === 'download' && record.targetPath)).toEqual([
        join(dir, 'photos', 'beach.jpg'),
        join(dir, 'photos', '2025', 'snow.jpg')
      ])
      expect(queued.map((record) => record.name)).toEqual([
        'photos/beach.jpg',
        'photos/2025/snow.jpg'
      ])
    })

    it('numbers a folder name that is taken, and keeps every path safe and inside the folder', async () => {
      await mkdir(join(dir, 'photos'))
      storage.folderFiles.mockResolvedValue([
        treeFile('photos/../../escape.txt', '../../escape.txt'),
        treeFile('photos/a:b.txt', 'a:b.txt'),
        treeFile('photos/a_b.txt', 'a_b.txt'),
        treeFile('photos/CON', 'CON')
      ])
      const result = await service().downloadFolder(request)
      expect(result.savedAs).toBe('photos (2)')
      const root = join(dir, 'photos (2)')
      expect(queued.map((record) => record.kind === 'download' && record.targetPath)).toEqual([
        join(root, 'download', 'download', 'escape.txt'),
        join(root, 'a_b.txt'),
        join(root, 'a_b (2).txt'),
        join(root, '_CON')
      ])
    })

    it('counts, deletes and restores a folder in the template', async () => {
      const options = { platform: 's3', tier: 'Bulk', days: 3 } as const
      const downloads = service()
      expect(await downloads.summarizeFolder(request)).toEqual({ files: 2, bytes: 10, archived: 1 })
      await downloads.deleteFolder(request)
      expect(await downloads.restoreFolder({ ...request, options })).toBe(1)
      expect(storage.summarizeFolder).toHaveBeenCalledWith(ACCESS, 'photos/')
      expect(storage.deleteFolder).toHaveBeenCalledWith(ACCESS, 'photos/')
      expect(storage.restoreFolder).toHaveBeenCalledWith(ACCESS, 'photos/', options)
    })
  })
})
