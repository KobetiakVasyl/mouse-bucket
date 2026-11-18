// Pure helpers for S3Service: restore states, folder listings and region headers. See docs/ARCHITECTURE.md.
import type { _Object, CommonPrefix, RestoreStatus } from '@aws-sdk/client-s3'
import type { FileAccess, FolderEntry, StoredFile } from '../../shared/types/storage-types'
import { ARCHIVE_STORAGE_CLASSES, DEFAULT_STORAGE_CLASS } from '../constants/s3-constants'
import type { ListedObject } from '../types/s3-service-types'
import { propertyOf } from './error-utils'
import { prefixFolder } from './storage-utils'

export function accessOf(storageClass: string, restore: RestoreStatus | undefined): FileAccess {
  if (!ARCHIVE_STORAGE_CLASSES.has(storageClass)) return { state: 'available' }
  if (restore === undefined) return { state: 'archived' }
  if (restore.IsRestoreInProgress === true) return { state: 'restoring' }
  if (restore.RestoreExpiryDate === undefined) return { state: 'archived' }
  return { state: 'restored', until: restore.RestoreExpiryDate.toISOString() }
}

export function foldersOf(
  commonPrefixes: CommonPrefix[] | undefined,
  prefix: string
): FolderEntry[] {
  if (commonPrefixes === undefined) return []
  return commonPrefixes.flatMap((common) =>
    common.Prefix === undefined ? [] : [prefixFolder(common.Prefix, prefix)]
  )
}

function isListedObject(object: _Object): object is ListedObject {
  return object.Key !== undefined && object.Size !== undefined && object.LastModified !== undefined
}

// The folder's own marker object, whose key is the prefix itself, isn't a file in it.
export function filesOf(contents: _Object[] | undefined, prefix: string): StoredFile[] {
  if (contents === undefined) return []
  return contents
    .filter(isListedObject)
    .filter((object) => object.Key !== prefix)
    .map((object) => {
      const storageClass =
        object.StorageClass === undefined ? DEFAULT_STORAGE_CLASS : object.StorageClass
      return {
        key: object.Key,
        name: object.Key.slice(prefix.length),
        size: object.Size,
        lastModified: object.LastModified.toISOString(),
        storageClass,
        access: accessOf(storageClass, object.RestoreStatus)
      }
    })
}

// The x-amz-bucket-region header of a failed request, or '' when it has none.
export function bucketRegionHeader(error: unknown): string {
  const headers = propertyOf(propertyOf(error, '$response'), 'headers')
  const region = propertyOf(headers, 'x-amz-bucket-region')
  return typeof region === 'string' ? region : ''
}
