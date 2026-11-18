// Sends each storage call to the platform it's for: S3, Azure Blob Storage or Google Drive. See docs/ARCHITECTURE.md.
import type { StorageLocation } from '../../shared/types/location-types'
import type { FolderListing, RestoreOptions } from '../../shared/types/storage-types'
import type { Credentials, StorageAccess } from '../types/credential-types'
import type {
  DownloadFileOptions,
  TemplateTarget,
  UploadFileOptions
} from '../types/storage-service-types'
import { UserError } from '../utils/error-utils'
import type { AzureBlobService } from './azure-blob-service'
import type { GoogleDriveService } from './google-drive-service'
import type { S3Service } from './s3-service'

export class StorageService {
  constructor(
    private readonly s3: S3Service,
    private readonly azure: AzureBlobService,
    private readonly drive: GoogleDriveService
  ) {}

  // Checks the keys reach the location, and fills in what a template keeps besides it: S3's region for the bucket, or
  // the Google Drive folder's name.
  async resolve(location: StorageLocation, credentials: Credentials): Promise<TemplateTarget> {
    if (location.platform === 's3' && credentials.platform === 's3') {
      return { ...location, region: await this.s3.findRegion(credentials, location.bucket) }
    }
    if (location.platform === 'azure' && credentials.platform === 'azure') {
      const { account, container } = location
      await this.azure.checkContainer({ platform: 'azure', account, container, credentials })
      return location
    }
    if (location.platform === 'google-drive' && credentials.platform === 'google-drive') {
      const folder = await this.drive.describeFolder(credentials, location.folderId)
      return { platform: 'google-drive', ...folder }
    }
    throw new UserError('These keys are for another platform.')
  }

  listFolder(
    access: StorageAccess,
    folder: string,
    continuationToken: string | null
  ): Promise<FolderListing> {
    if (access.platform === 's3') return this.s3.listFolder(access, folder, continuationToken)
    if (access.platform === 'azure') return this.azure.listFolder(access, folder, continuationToken)
    return this.drive.listFolder(access, folder, continuationToken)
  }

  uploadFile(access: StorageAccess, options: UploadFileOptions): Promise<void> {
    if (access.platform === 's3') return this.s3.uploadFile(access, options)
    if (access.platform === 'azure') return this.azure.uploadFile(access, options)
    return this.drive.uploadFile(access, options)
  }

  abortUpload(access: StorageAccess, key: string, uploadId: string): Promise<void> {
    if (access.platform === 's3') return this.s3.abortUpload(access, key, uploadId)
    if (access.platform === 'azure') return this.azure.abortUpload()
    return this.drive.abortUpload(access, key, uploadId)
  }

  downloadFile(access: StorageAccess, options: DownloadFileOptions): Promise<void> {
    if (access.platform === 's3') return this.s3.downloadFile(access, options)
    if (access.platform === 'azure') return this.azure.downloadFile(access, options)
    return this.drive.downloadFile(access, options)
  }

  deleteFile(access: StorageAccess, key: string): Promise<void> {
    if (access.platform === 's3') return this.s3.deleteFile(access, key)
    if (access.platform === 'azure') return this.azure.deleteFile(access, key)
    return this.drive.deleteFile(access, key)
  }

  fileName(access: StorageAccess, key: string): Promise<string> {
    if (access.platform === 's3') return this.s3.fileName(access, key)
    if (access.platform === 'azure') return this.azure.fileName(access, key)
    return this.drive.fileName(access, key)
  }

  // S3 restores a temporary copy for some days; Azure rehydrates the blob into another tier for good.
  async restoreFile(access: StorageAccess, key: string, options: RestoreOptions): Promise<void> {
    if (access.platform === 's3' && options.platform === 's3') {
      return this.s3.restoreFile(access, key, options.tier, options.days)
    }
    if (access.platform === 'azure' && options.platform === 'azure') {
      return this.azure.restoreFile(access, key, options.tier, options.priority)
    }
    if (access.platform === 'google-drive') {
      throw new UserError("Files on Google Drive don't need a restore.")
    }
    throw new UserError('Those restore choices are for another platform.')
  }
}
