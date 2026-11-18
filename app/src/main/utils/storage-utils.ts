// Ties templates, transfers and keys to their platform: where a template points, the access a call needs, and the
// storage class each platform takes. See docs/ARCHITECTURE.md.
import type {
  AccessTier,
  FolderEntry,
  UploadClass,
  UploadStorageClass
} from '../../shared/types/storage-types'
import type { Platform, Template } from '../../shared/types/template-types'
import {
  AccessTierSchema,
  UploadStorageClassSchema
} from '../../shared/validation/storage-validation'
import type { StorageLocation } from '../../shared/types/location-types'
import type { Credentials, StorageAccess, TransferPlace } from '../types/credential-types'
import type { TemplateTarget } from '../types/storage-service-types'
import { UserError } from './error-utils'

// Where a template points, without its folder.
export function placeOf(template: Template): TransferPlace {
  if (template.platform === 's3') {
    return { platform: 's3', bucket: template.bucket, region: template.region }
  }
  if (template.platform === 'azure') {
    return { platform: 'azure', account: template.account, container: template.container }
  }
  return { platform: 'google-drive', folderId: template.folderId }
}

// The place with the keys that reach it, which must be for the same platform.
export function accessFor(place: TransferPlace, credentials: Credentials): StorageAccess {
  if (place.platform === 's3' && credentials.platform === 's3') return { ...place, credentials }
  if (place.platform === 'azure' && credentials.platform === 'azure') {
    return { ...place, credentials }
  }
  if (place.platform === 'google-drive' && credentials.platform === 'google-drive') {
    return { ...place, credentials }
  }
  throw new UserError("This template's keys are for another platform. Edit it and enter new ones.")
}

export function s3ClassOf(storageClass: UploadClass): UploadStorageClass {
  const parsed = UploadStorageClassSchema.safeParse(storageClass)
  if (!parsed.success) throw new UserError('Choose an S3 storage class for this upload.')
  return parsed.data
}

export function accessTierOf(storageClass: UploadClass): AccessTier {
  const parsed = AccessTierSchema.safeParse(storageClass)
  if (!parsed.success) throw new UserError('Choose an Azure access tier for this upload.')
  return parsed.data
}

// Checks the page sent a storage class the template's platform has: none for Google Drive.
export function checkUploadClass(platform: Platform, storageClass: UploadClass): void {
  if (platform === 's3') s3ClassOf(storageClass)
  else if (platform === 'azure') accessTierOf(storageClass)
  else if (storageClass !== null) throw new UserError('Google Drive has no storage classes.')
}

// A folder in a bucket or container, which is a shared name prefix: the prefix opens it, and its last part names it.
export function prefixFolder(folderPrefix: string, parentPrefix: string): FolderEntry {
  return { id: folderPrefix, name: folderPrefix.slice(parentPrefix.length).replace(/\/$/, '') }
}

// What a changed template keeps without asking its platform again: everything, when it still points at the same bucket,
// container or Drive folder. null when the new location needs checking.
export function keptTarget(current: Template, location: StorageLocation): TemplateTarget | null {
  if (current.platform === 's3' && location.platform === 's3') {
    return current.bucket === location.bucket ? { ...location, region: current.region } : null
  }
  if (current.platform === 'azure' && location.platform === 'azure') {
    const same = current.account === location.account && current.container === location.container
    return same ? location : null
  }
  if (current.platform === 'google-drive' && location.platform === 'google-drive') {
    return current.folderId === location.folderId
      ? { platform: 'google-drive', folderId: current.folderId, folderName: current.folderName }
      : null
  }
  return null
}
