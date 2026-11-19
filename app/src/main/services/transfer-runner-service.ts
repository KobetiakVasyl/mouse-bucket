// Runs one upload or download on its platform from where it stopped, and throws away what a cancelled one moved. See
// docs/ARCHITECTURE.md.
import { mkdir, rm, stat } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { StorageAccess } from '../types/credential-types'
import type {
  DownloadRecord,
  TransferRecord,
  TransferRunContext,
  TransferRunner,
  UploadRecord
} from '../types/transfer-queue-types'
import { partPathOf } from '../utils/download-utils'
import { UploadExpiredError } from '../utils/error-utils'
import { sizeOrZero } from '../utils/file-utils'
import { partSizeFor, partsBytes } from '../utils/part-utils'
import { accessFor } from '../utils/storage-utils'
import type { StorageService } from './storage-service'
import type { TemplateService } from './template-service'

export class TransferRunnerService implements TransferRunner {
  constructor(
    private readonly storage: Pick<StorageService, 'downloadFile' | 'uploadFile' | 'abortUpload'>,
    private readonly templates: Pick<TemplateService, 'credentialsFor'>
  ) {}

  async run(record: TransferRecord, context: TransferRunContext): Promise<void> {
    const access = await this.accessOf(record)
    if (record.kind === 'download') await this.download(record, access, context)
    else await this.upload(record, access, context)
  }

  // Deletes a download's .part file, or tells the platform to throw away an unfinished upload.
  async discard(record: TransferRecord): Promise<void> {
    if (record.kind === 'download') {
      await rm(partPathOf(record.targetPath), { force: true })
    } else if (record.uploadId !== null) {
      await this.storage.abortUpload(await this.accessOf(record), record.key, record.uploadId)
    }
  }

  async bytesDone(record: TransferRecord): Promise<number> {
    if (record.kind === 'download') {
      return record.etag === null ? 0 : sizeOrZero(partPathOf(record.targetPath))
    }
    const partNumbers = record.parts.map((part) => part.partNumber)
    return partsBytes(partNumbers, record.partSize, record.fileSize)
  }

  private async download(
    record: DownloadRecord,
    access: StorageAccess,
    { signal, progress, save }: TransferRunContext
  ): Promise<void> {
    // A file of a folder download goes into folders that may not exist yet.
    await mkdir(dirname(record.targetPath), { recursive: true })
    await this.storage.downloadFile(access, {
      key: record.key,
      targetPath: record.targetPath,
      etag: record.etag,
      bytesTotal: record.bytesTotal,
      signal,
      onStart: (etag, bytesTotal) => save({ ...record, etag, bytesTotal }),
      onProgress: progress
    })
  }

  // A file that changed since the upload began starts over, because the parts the platform has no longer match it.
  // So does an upload the platform no longer has, such as one a lifecycle rule removed or one older than a week.
  private async upload(
    record: UploadRecord,
    access: StorageAccess,
    context: TransferRunContext
  ): Promise<void> {
    const info = await stat(record.filePath)
    let current = record
    if (info.size !== record.fileSize || info.mtimeMs !== record.fileModifiedMs) {
      if (record.uploadId !== null) {
        await this.storage.abortUpload(access, record.key, record.uploadId).catch(() => undefined)
      }
      current = this.restarted(record, info.size, info.mtimeMs)
      context.save(current)
    }
    try {
      await this.sendParts(current, access, context)
    } catch (error) {
      const started = current.uploadId !== null || current.parts.length > 0
      if (!started || !(error instanceof UploadExpiredError)) throw error
      current = this.restarted(current, current.fileSize, current.fileModifiedMs)
      context.save(current)
      await this.sendParts(current, access, context)
    }
  }

  private async sendParts(
    record: UploadRecord,
    access: StorageAccess,
    { signal, progress, save }: TransferRunContext
  ): Promise<void> {
    let current = record
    const keep = (next: UploadRecord): void => {
      current = next
      save(current)
    }
    await this.storage.uploadFile(access, {
      key: record.key,
      storageClass: record.storageClass,
      filePath: record.filePath,
      fileSize: record.fileSize,
      partSize: record.partSize,
      uploadId: record.uploadId,
      parts: record.parts,
      signal,
      onCreated: (uploadId) => keep({ ...current, uploadId }),
      onPart: (part) => keep({ ...current, parts: [...current.parts, part] }),
      onProgress: (bytesDone) => progress(bytesDone, record.fileSize)
    })
  }

  private restarted(record: UploadRecord, fileSize: number, fileModifiedMs: number): UploadRecord {
    return {
      ...record,
      fileSize,
      fileModifiedMs,
      partSize: partSizeFor(fileSize),
      uploadId: null,
      parts: []
    }
  }

  // Where the transfer started, with the template's keys as they are now.
  private async accessOf(record: TransferRecord): Promise<StorageAccess> {
    return accessFor(record.place, await this.templates.credentialsFor(record.templateId))
  }
}
