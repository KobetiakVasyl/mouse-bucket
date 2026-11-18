// Talks to Azure Blob Storage with a storage account key: checks a container, lists a folder, uploads and downloads blobs
// from where they stopped, deletes them, and rehydrates archived ones. See docs/ARCHITECTURE.md.
import { createHash } from 'node:crypto'
import type { BlobDownloadResponseParsed, BlockBlobClient } from '@azure/storage-blob'
import type {
  FolderListing,
  RehydratePriority,
  RehydrateTier
} from '../../shared/types/storage-types'
import { LISTING_PAGE_SIZE, UNREACHABLE_CODES } from '../constants/azure-constants'
import { PARTS_AT_ONCE } from '../constants/part-constants'
import type { ConnectContainer } from '../types/azure-types'
import type { AzureAccess } from '../types/credential-types'
import type {
  DownloadFileOptions,
  PlatformStorage,
  UploadFileOptions
} from '../types/storage-service-types'
import { azureFilesOf, azureFoldersOf, blockId } from '../utils/azure-utils'
import { resumeOffset, saveDownload } from '../utils/download-utils'
import { httpStatusOf, stringField, UploadExpiredError, UserError } from '../utils/error-utils'
import { readRange } from '../utils/file-utils'
import { partNumbers, partRange, partsBytes } from '../utils/part-utils'
import { forEachLimited } from '../utils/poll-utils'
import { accessTierOf } from '../utils/storage-utils'

// Azure checks each block, and a small file sent whole, against its MD5.
function md5Of(body: Buffer): Buffer {
  return createHash('md5').update(body).digest()
}

export class AzureBlobService implements PlatformStorage<AzureAccess> {
  constructor(private readonly connect: ConnectContainer) {}

  // Fails unless the key reaches the container. A storage account that doesn't exist has no address to reach.
  async checkContainer(access: AzureAccess): Promise<void> {
    try {
      await this.connect(access).getProperties()
    } catch (error) {
      if (UNREACHABLE_CODES.has(stringField(error, 'code'))) {
        throw new UserError(
          `Couldn't reach the storage account "${access.account}". Check its name and the internet connection.`
        )
      }
      throw error
    }
  }

  async listFolder(
    access: AzureAccess,
    prefix: string,
    continuationToken: string | null
  ): Promise<FolderListing> {
    const pages = this.connect(access)
      .listBlobsByHierarchy('/', { prefix, includeMetadata: true })
      .byPage({
        continuationToken: continuationToken === null ? undefined : continuationToken,
        maxPageSize: LISTING_PAGE_SIZE
      })
    const page = await pages.next()
    if (page.done === true) return { folders: [], files: [], nextToken: null }
    const { segment, continuationToken: next } = page.value
    return {
      folders: azureFoldersOf(segment.blobPrefixes, prefix),
      files: azureFilesOf(segment.blobItems, prefix),
      nextToken: next === undefined || next === '' ? null : next
    }
  }

  // Sends a file over one part as blocks, only those Azure doesn't have yet, then commits them in the chosen tier.
  async uploadFile(access: AzureAccess, options: UploadFileOptions): Promise<void> {
    const { key, filePath, fileSize, partSize, signal, onPart, onProgress } = options
    const tier = accessTierOf(options.storageClass)
    const blob = this.connect(access).getBlockBlobClient(key)
    signal.throwIfAborted()
    if (fileSize <= partSize) {
      const body = await readRange(filePath, 0, fileSize)
      await blob.upload(body, fileSize, {
        tier,
        transactionalContentMD5: md5Of(body),
        abortSignal: signal
      })
      onProgress(fileSize)
      return
    }

    const done = new Set(options.parts.map((part) => part.partNumber))
    let bytesDone = partsBytes([...done], partSize, fileSize)
    onProgress(bytesDone)
    const all = partNumbers(fileSize, partSize)
    const missing = all.filter((partNumber) => !done.has(partNumber))
    await forEachLimited(missing, PARTS_AT_ONCE, async (partNumber) => {
      const { start, length } = partRange(partNumber, partSize, fileSize)
      const body = await readRange(filePath, start, length)
      const checksum = md5Of(body)
      await blob.stageBlock(blockId(partNumber), body, length, {
        transactionalContentMD5: checksum,
        abortSignal: signal
      })
      onPart({ partNumber, etag: '', checksum: checksum.toString('base64') })
      bytesDone += length
      onProgress(bytesDone)
    })
    await this.commit(blob, all.map(blockId), tier, signal)
  }

  // Azure keeps no handle on an unfinished upload, and discards blocks nobody committed within a week on its own, so
  // there's nothing to stop.
  abortUpload(): Promise<void> {
    return Promise.resolve()
  }

  // Streams one blob into a .part file that becomes the target only once complete. A .part file left by an earlier run
  // is continued with a range request, which Azure answers only while the blob is still the version it came from.
  async downloadFile(access: AzureAccess, options: DownloadFileOptions): Promise<void> {
    const { key, targetPath, etag, bytesTotal, signal, onStart, onProgress } = options
    const blob = this.connect(access).getBlockBlobClient(key)
    let offset = await resumeOffset(targetPath, etag, bytesTotal)
    if (offset === null) return

    let response: BlobDownloadResponseParsed
    try {
      response = await this.fetch(blob, offset, etag, signal)
    } catch (error) {
      // 412: the blob changed since the download began. 416: the .part is longer than it. Either way, start over.
      const status = httpStatusOf(error)
      if (offset === 0 || (status !== 412 && status !== 416)) throw error
      offset = 0
      response = await this.fetch(blob, 0, null, signal)
    }
    const body = response.readableStreamBody
    if (body === undefined) throw new Error('Azure returned no file content.')
    if (response.contentLength === undefined || response.etag === undefined) {
      throw new Error("Azure didn't say how large the file is.")
    }
    const total = offset + response.contentLength
    onStart(response.etag, total)
    await saveDownload(body, { targetPath, offset, total }, signal, onProgress)
  }

  // Deletes the blob with its snapshots. An account with soft delete on keeps it for its retention days.
  async deleteFile(access: AzureAccess, key: string): Promise<void> {
    await this.connect(access).getBlockBlobClient(key).delete({ deleteSnapshots: 'include' })
  }

  // Moves an archived blob into another tier, which takes hours at standard priority and less at high priority.
  async restoreFile(
    access: AzureAccess,
    key: string,
    tier: RehydrateTier,
    priority: RehydratePriority
  ): Promise<void> {
    await this.connect(access)
      .getBlockBlobClient(key)
      .setAccessTier(tier, { rehydratePriority: priority })
  }

  // The blob's name is its path in the container, so Azure needs no other name for the file.
  async fileName(_access: AzureAccess, key: string): Promise<string> {
    return key
  }

  // Azure rejects the list when blocks in it are gone, such as after a week uncommitted; the upload then starts over.
  private async commit(
    blob: BlockBlobClient,
    blockIds: string[],
    tier: string,
    signal: AbortSignal
  ): Promise<void> {
    try {
      await blob.commitBlockList(blockIds, { tier, abortSignal: signal })
    } catch (error) {
      if (stringField(error, 'code') === 'InvalidBlockList') throw new UploadExpiredError()
      throw error
    }
  }

  private fetch(
    blob: BlockBlobClient,
    offset: number,
    etag: string | null,
    signal: AbortSignal
  ): Promise<BlobDownloadResponseParsed> {
    const resume = offset > 0 && etag !== null ? { conditions: { ifMatch: etag } } : {}
    return blob.download(offset, undefined, { abortSignal: signal, ...resume })
  }
}
