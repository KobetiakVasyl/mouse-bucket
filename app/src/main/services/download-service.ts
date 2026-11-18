// Browses a download template's bucket, and downloads, deletes or restores its files. See docs/ARCHITECTURE.md.
import { basename, join } from 'node:path'
import type { WebContents } from 'electron'
import type {
  DownloadRequest,
  FolderListing,
  FolderRequest,
  RestoreRequest
} from '../../shared/types/s3-types'
import type { BucketAccess } from '../types/credential-types'
import { SAVE_DIALOG_TITLE } from '../constants/dialog-constants'
import { saveNameFor } from '../utils/file-name-utils'
import type { DialogService } from './dialog-service'
import type { S3Service } from './s3-service'
import type { TemplateService } from './template-service'
import type { TransferService } from './transfer-service'

export class DownloadService {
  constructor(
    private readonly templates: Pick<TemplateService, 'getOfKind' | 'accessFor'>,
    private readonly s3: Pick<
      S3Service,
      'listFolder' | 'downloadFile' | 'deleteFile' | 'restoreFile'
    >,
    private readonly transfers: Pick<TransferService, 'add'>,
    private readonly dialogs: Pick<DialogService, 'chooseSavePath'>,
    // The system's Downloads folder, where the Save dialog starts.
    private readonly downloadsFolder: () => string
  ) {}

  async listFolder({
    templateId,
    prefix,
    continuationToken
  }: FolderRequest): Promise<FolderListing> {
    return this.s3.listFolder(await this.bucketOf(templateId), prefix, continuationToken)
  }

  // Main opens the Save dialog itself; the page only names the S3 key. Returns whether a download was queued.
  async downloadFile({ templateId, key }: DownloadRequest, sender: WebContents): Promise<boolean> {
    const template = await this.templates.getOfKind(templateId, 'download')
    const defaultPath = join(this.downloadsFolder(), saveNameFor(key))
    const targetPath = await this.dialogs.chooseSavePath(sender, SAVE_DIALOG_TITLE, defaultPath)
    if (targetPath === null) return false

    this.transfers.add(
      { kind: 'download', templateName: template.name, name: basename(targetPath), bytesTotal: 0 },
      async ({ signal, progress }) => {
        const access = await this.templates.accessFor(template)
        await this.s3.downloadFile(access, { key, targetPath, signal, onProgress: progress })
      }
    )
    return true
  }

  async deleteFile({ templateId, key }: DownloadRequest): Promise<void> {
    await this.s3.deleteFile(await this.bucketOf(templateId), key)
  }

  async restoreFile({ templateId, key, tier, days }: RestoreRequest): Promise<void> {
    await this.s3.restoreFile(await this.bucketOf(templateId), key, tier, days)
  }

  private async bucketOf(templateId: string): Promise<BucketAccess> {
    return this.templates.accessFor(await this.templates.getOfKind(templateId, 'download'))
  }
}
