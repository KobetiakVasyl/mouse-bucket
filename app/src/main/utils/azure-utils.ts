// Pure helpers for AzureBlobService: block IDs, archive states, folder listings and the container's address. See
// docs/ARCHITECTURE.md.
import type { BlobItem, BlobPrefix } from '@azure/storage-blob'
import { AZURE_HOST_SUFFIX } from '../../shared/constants/location-constants'
import type { FileAccess, FolderEntry, StoredFile } from '../../shared/types/storage-types'
import {
  ARCHIVE_TIER,
  BLOCK_ID_DIGITS,
  FOLDER_MARKER_METADATA,
  REHYDRATING_PREFIX
} from '../constants/azure-constants'
import { prefixFolder } from './storage-utils'

export function containerUrl(account: string, container: string): string {
  return `https://${account}${AZURE_HOST_SUFFIX}/${container}`
}

// A block's ID: its number, padded so every ID of the blob has the same length, in base64 as Azure requires.
export function blockId(partNumber: number): string {
  return Buffer.from(`block-${String(partNumber).padStart(BLOCK_ID_DIGITS, '0')}`).toString(
    'base64'
  )
}

// An archived blob must be rehydrated into another tier before it can be downloaded. Once it is, it's simply available.
export function azureAccessOf(accessTier: string | undefined, archiveStatus?: string): FileAccess {
  if (accessTier !== ARCHIVE_TIER) return { state: 'available' }
  if (archiveStatus?.startsWith(REHYDRATING_PREFIX) === true) return { state: 'restoring' }
  return { state: 'archived' }
}

export function azureFoldersOf(prefixes: BlobPrefix[] | undefined, prefix: string): FolderEntry[] {
  return (prefixes ?? []).map((folder) => prefixFolder(folder.name, prefix))
}

// Folder markers, which accounts with a hierarchical namespace keep for each folder, aren't files.
export function azureFilesOf(items: BlobItem[], prefix: string): StoredFile[] {
  return items
    .filter((item) => item.metadata?.[FOLDER_MARKER_METADATA] !== 'true')
    .filter((item) => item.name !== prefix)
    .map((item) => {
      const tier = item.properties.accessTier
      return {
        key: item.name,
        name: item.name.slice(prefix.length),
        size: item.properties.contentLength ?? 0,
        lastModified: item.properties.lastModified.toISOString(),
        storageClass: tier ?? '',
        access: azureAccessOf(tier, item.properties.archiveStatus)
      }
    })
}
