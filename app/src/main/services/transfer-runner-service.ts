// Runs one upload or download through S3 from where it stopped, and throws away what a cancelled one moved. See docs/ARCHITECTURE.md.
import { rm, stat } from 'node:fs/promises'
import { PART_FILE_SUFFIX } from '../constants/s3-constants'
import type { BucketAccess } from '../types/credential-types'
import type {
  DownloadRecord,
  TransferRecord,
  TransferRunContext,
  TransferRunner,
  UploadRecord
} from '../types/transfer-queue-types'
import { propertyOf } from '../utils/error-utils'
import { sizeOrZero } from '../utils/file-utils'
import { partSizeFor, partsBytes } from '../utils/s3-utils'
import type { S3Service } from './s3-service'
import type { TemplateService } from './template-service'

export class TransferRunnerService implements TransferRunner {
  constructor(
    private readonly s3: Pick<S3Service, 'downloadFile' | 'uploadFile' | 'abortUpload'>,
    private readonly templates: Pick<TemplateService, 'credentialsFor'>
  ) {}

  async run(record: TransferRecord, context: TransferRunContext): Promise<void> {
    const access = await this.accessOf(record)
    if (record.kind === 'download') await this.download(record, access, context)
    else await this.upload(record, access, context)
  }

  // Deletes a download's .part file, or stops an upload's multipart upload so S3 deletes its parts.
  async discard(record: TransferRecord): Promise<void> {
    if (record.kind === 'download') {
      await rm(`${record.targetPath}${PART_FILE_SUFFIX}`, { force: true })
    } else if (record.uploadId !== null) {
      await this.s3.abortUpload(await this.accessOf(record), record.key, record.uploadId)
    }
  }

  async bytesDone(record: TransferRecord): Promise<number> {
    if (record.kind === 'download') {
      return record.etag === null ? 0 : sizeOrZero(`${record.targetPath}${PART_FILE_SUFFIX}`)
    }
    const partNumbers = record.parts.map((part) => part.partNumber)
    return partsBytes(partNumbers, record.partSize, record.fileSize)
  }

  private async download(
    record: DownloadRecord,
    access: BucketAccess,
    { signal, progress, save }: TransferRunContext
  ): Promise<void> {
    await this.s3.downloadFile(access, {
      key: record.key,
      targetPath: record.targetPath,
      etag: record.etag,
      bytesTotal: record.bytesTotal,
      signal,
      onStart: (etag, bytesTotal) => save({ ...record, etag, bytesTotal }),
      onProgress: progress
    })
  }

  // A file that changed since the upload began starts over, because the parts S3 has no longer match it.
  // So does an upload S3 no longer knows, such as one a lifecycle rule removed.
  private async upload(
    record: UploadRecord,
    access: BucketAccess,
    context: TransferRunContext
  ): Promise<void> {
    const info = await stat(record.filePath)
    let current = record
    if (info.size !== record.fileSize || info.mtimeMs !== record.fileModifiedMs) {
      if (record.uploadId !== null) {
        await this.s3.abortUpload(access, record.key, record.uploadId).catch(() => undefined)
      }
      current = this.restarted(record, info.size, info.mtimeMs)
      context.save(current)
    }
    try {
      await this.sendParts(current, access, context)
    } catch (error) {
      if (current.uploadId === null || propertyOf(error, 'name') !== 'NoSuchUpload') throw error
      current = this.restarted(current, current.fileSize, current.fileModifiedMs)
      context.save(current)
      await this.sendParts(current, access, context)
    }
  }

  private async sendParts(
    record: UploadRecord,
    access: BucketAccess,
    { signal, progress, save }: TransferRunContext
  ): Promise<void> {
    let current = record
    const keep = (next: UploadRecord): void => {
      current = next
      save(current)
    }
    await this.s3.uploadFile(access, {
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

  // The bucket and region the transfer started with, and the template's keys as they are now.
  private async accessOf(record: TransferRecord): Promise<BucketAccess> {
    const credentials = await this.templates.credentialsFor(record.templateId)
    return { bucket: record.bucket, region: record.region, credentials }
  }
}
