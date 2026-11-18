// Lists one folder level of a bucket: its subfolders, and its files with their storage class and restore state. See docs/ARCHITECTURE.md.
import {
  type _Object,
  type CommonPrefix,
  ListObjectsV2Command,
  type RestoreStatus,
  type S3Client
} from '@aws-sdk/client-s3'
import type { FileAccess, FolderListing, S3File } from '../../shared/ipc'

// Files in these classes must be restored before they can be downloaded.
const ARCHIVE_CLASSES: ReadonlySet<string> = new Set(['GLACIER', 'DEEP_ARCHIVE'])

type ListedObject = _Object & { Key: string; Size: number; LastModified: Date }

function isListedObject(object: _Object): object is ListedObject {
  return object.Key !== undefined && object.Size !== undefined && object.LastModified !== undefined
}

export function accessOf(storageClass: string, restore: RestoreStatus | undefined): FileAccess {
  if (!ARCHIVE_CLASSES.has(storageClass)) return { state: 'available' }
  if (restore === undefined) return { state: 'archived' }
  if (restore.IsRestoreInProgress === true) return { state: 'restoring' }
  if (restore.RestoreExpiryDate === undefined) return { state: 'archived' }
  return { state: 'restored', until: restore.RestoreExpiryDate.toISOString() }
}

function foldersOf(commonPrefixes: CommonPrefix[] | undefined): string[] {
  if (commonPrefixes === undefined) return []
  return commonPrefixes.flatMap((common) => (common.Prefix === undefined ? [] : [common.Prefix]))
}

// The folder's own marker object, whose key is the prefix itself, isn't a file in it.
function filesOf(contents: _Object[] | undefined, prefix: string): S3File[] {
  if (contents === undefined) return []
  return contents
    .filter(isListedObject)
    .filter((object) => object.Key !== prefix)
    .map((object) => {
      const storageClass = object.StorageClass === undefined ? 'STANDARD' : object.StorageClass
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

export async function listFolder(
  client: S3Client,
  bucket: string,
  prefix: string,
  continuationToken: string | null
): Promise<FolderListing> {
  const output = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      Delimiter: '/',
      ContinuationToken: continuationToken === null ? undefined : continuationToken,
      OptionalObjectAttributes: ['RestoreStatus']
    })
  )
  const token = output.NextContinuationToken
  return {
    folders: foldersOf(output.CommonPrefixes),
    files: filesOf(output.Contents, prefix),
    nextToken: output.IsTruncated === true && token !== undefined ? token : null
  }
}
