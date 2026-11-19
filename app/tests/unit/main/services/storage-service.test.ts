import { describe, expect, it, vi } from 'vitest'
import type { AzureBlobService } from '../../../../src/main/services/azure-blob-service'
import type { GoogleDriveService } from '../../../../src/main/services/google-drive-service'
import type { S3Service } from '../../../../src/main/services/s3-service'
import { StorageService } from '../../../../src/main/services/storage-service'
import type {
  AzureAccess,
  DriveAccess,
  S3Access
} from '../../../../src/main/types/credential-types'

const S3_KEYS = { platform: 's3', accessKeyId: 'AKIA', secretAccessKey: 's' } as const
const AZURE_KEY = { platform: 'azure', accountKey: 'key' } as const
const DRIVE_KEYS = {
  platform: 'google-drive',
  clientId: 'id',
  clientSecret: 'secret',
  refreshToken: 'refresh'
} as const
const S3_ACCESS: S3Access = {
  platform: 's3',
  bucket: 'b1',
  region: 'eu-west-1',
  credentials: S3_KEYS
}
const AZURE_ACCESS: AzureAccess = {
  platform: 'azure',
  account: 'myaccount',
  container: 'backups',
  credentials: AZURE_KEY
}
const DRIVE_ACCESS: DriveAccess = {
  platform: 'google-drive',
  folderId: 'root',
  credentials: DRIVE_KEYS
}
const LISTING = { folders: [], files: [], nextToken: null }

function setup(): {
  storage: StorageService
  s3: Record<string, ReturnType<typeof vi.fn>>
  azure: Record<string, ReturnType<typeof vi.fn>>
  drive: Record<string, ReturnType<typeof vi.fn>>
} {
  const s3 = {
    findRegion: vi.fn(async () => 'eu-north-1'),
    listFolder: vi.fn(async () => LISTING),
    deleteFile: vi.fn(async () => undefined),
    restoreFile: vi.fn(async () => undefined),
    fileName: vi.fn(async () => 'a.zip')
  }
  const azure = {
    checkContainer: vi.fn(async () => undefined),
    listFolder: vi.fn(async () => LISTING),
    deleteFile: vi.fn(async () => undefined),
    restoreFile: vi.fn(async () => undefined),
    abortUpload: vi.fn(async () => undefined)
  }
  const drive = {
    describeFolder: vi.fn(async () => ({ folderId: 'f1', folderName: 'Photos' })),
    listFolder: vi.fn(async () => LISTING),
    deleteFile: vi.fn(async () => undefined),
    fileName: vi.fn(async () => 'b.jpg'),
    abortUpload: vi.fn(async () => undefined)
  }
  const storage = new StorageService(
    s3 as unknown as S3Service,
    azure as unknown as AzureBlobService,
    drive as unknown as GoogleDriveService
  )
  return { storage, s3, azure, drive }
}

describe('StorageService', () => {
  it("checks each platform's location with its keys, and fills in what the template keeps", async () => {
    const { storage, azure } = setup()
    expect(await storage.resolve({ platform: 's3', bucket: 'b1', prefix: 'a/' }, S3_KEYS)).toEqual({
      platform: 's3',
      bucket: 'b1',
      prefix: 'a/',
      region: 'eu-north-1'
    })
    const container = {
      platform: 'azure',
      account: 'myaccount',
      container: 'backups',
      prefix: ''
    } as const
    expect(await storage.resolve(container, AZURE_KEY)).toEqual(container)
    expect(azure.checkContainer).toHaveBeenCalledWith(AZURE_ACCESS)
    expect(await storage.resolve({ platform: 'google-drive', folderId: 'f1' }, DRIVE_KEYS)).toEqual(
      {
        platform: 'google-drive',
        folderId: 'f1',
        folderName: 'Photos'
      }
    )
    await expect(
      storage.resolve({ platform: 'google-drive', folderId: 'f1' }, S3_KEYS)
    ).rejects.toThrow('another platform')
  })

  it("sends each call to the access's platform", async () => {
    const { storage, s3, azure, drive } = setup()
    await storage.listFolder(S3_ACCESS, 'a/', null)
    await storage.listFolder(AZURE_ACCESS, '', 'next')
    await storage.listFolder(DRIVE_ACCESS, 'f2', null)
    expect(s3.listFolder).toHaveBeenCalledWith(S3_ACCESS, 'a/', null)
    expect(azure.listFolder).toHaveBeenCalledWith(AZURE_ACCESS, '', 'next')
    expect(drive.listFolder).toHaveBeenCalledWith(DRIVE_ACCESS, 'f2', null)
    expect(await storage.fileName(DRIVE_ACCESS, 'x1')).toBe('b.jpg')
    await storage.deleteFile(AZURE_ACCESS, 'a.zip')
    expect(azure.deleteFile).toHaveBeenCalledWith(AZURE_ACCESS, 'a.zip')
    await storage.abortUpload(DRIVE_ACCESS, 'a.zip', 'https://www.googleapis.com/upload/x')
    expect(drive.abortUpload).toHaveBeenCalled()
  })

  it("restores with the platform's own choices, and refuses Drive or mixed choices", async () => {
    const { storage, s3, azure } = setup()
    await storage.restoreFile(S3_ACCESS, 'a.zip', { platform: 's3', tier: 'Bulk', days: 3 })
    expect(s3.restoreFile).toHaveBeenCalledWith(S3_ACCESS, 'a.zip', 'Bulk', 3)
    const rehydrate = { platform: 'azure', tier: 'Cool', priority: 'High' } as const
    await storage.restoreFile(AZURE_ACCESS, 'a.zip', rehydrate)
    expect(azure.restoreFile).toHaveBeenCalledWith(AZURE_ACCESS, 'a.zip', 'Cool', 'High')
    await expect(storage.restoreFile(DRIVE_ACCESS, 'x1', rehydrate)).rejects.toThrow(
      "don't need a restore"
    )
    await expect(storage.restoreFile(S3_ACCESS, 'a.zip', rehydrate)).rejects.toThrow(
      'another platform'
    )
  })
})

describe('StorageService folders', () => {
  const treeFile = (key: string, state: 'available' | 'archived', size: number): unknown => ({
    key,
    name: key,
    path: key,
    size,
    lastModified: '',
    storageClass: '',
    access: { state }
  })

  it("counts a folder's files, size and archived ones, and restores only the archived ones", async () => {
    const { storage, s3 } = setup()
    s3.folderFiles = vi.fn(async () => [
      treeFile('a', 'archived', 5),
      treeFile('b', 'available', 7),
      treeFile('c', 'archived', 1)
    ])
    expect(await storage.summarizeFolder(S3_ACCESS, 'x/')).toEqual({
      files: 3,
      bytes: 13,
      archived: 2
    })
    const options = { platform: 's3', tier: 'Bulk', days: 2 } as const
    expect(await storage.restoreFolder(S3_ACCESS, 'x/', options)).toBe(2)
    expect(s3.restoreFile.mock.calls.map((call) => call[1]).sort()).toEqual(['a', 'c'])
    await expect(storage.restoreFolder(DRIVE_ACCESS, 'f1', options)).rejects.toThrow(
      "don't need a restore"
    )
  })
})
