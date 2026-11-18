// Queues the files the user picks for upload to an upload template's folder. See docs/ARCHITECTURE.md.
import { stat } from 'node:fs/promises'
import { basename } from 'node:path'
import type { WebContents } from 'electron'
import type { UploadRequest, UploadStorageClass } from '../../shared/types/s3-types'
import type { Template } from '../../shared/types/template-types'
import { partSizeFor } from '../utils/s3-utils'
import type { DialogService } from './dialog-service'
import type { TemplateService } from './template-service'
import type { TransferService } from './transfer-service'

export class UploadService {
  constructor(
    private readonly templates: Pick<TemplateService, 'getOfKind'>,
    private readonly transfers: Pick<TransferService, 'add'>,
    private readonly dialogs: Pick<DialogService, 'chooseFiles'>
  ) {}

  // Main opens the file picker itself, so the page never handles a local path. Returns how many files were queued.
  async chooseFiles(
    { templateId, storageClass }: UploadRequest,
    sender: WebContents
  ): Promise<number> {
    const template = await this.templates.getOfKind(templateId, 'upload')
    const filePaths = await this.dialogs.chooseFiles(sender, `Upload to ${template.name}`)
    let queued = 0
    for (const filePath of filePaths) {
      if (await this.queue(template, storageClass, filePath)) queued++
    }
    return queued
  }

  // A file keeps its name: its key is the template's folder plus the name. Anything but a file is skipped.
  private async queue(
    template: Template,
    storageClass: UploadStorageClass,
    filePath: string
  ): Promise<boolean> {
    const info = await stat(filePath)
    if (!info.isFile()) return false
    const name = basename(filePath)
    this.transfers.add({
      kind: 'upload',
      templateId: template.id,
      templateName: template.name,
      bucket: template.bucket,
      region: template.region,
      key: `${template.prefix}${name}`,
      name,
      storageClass,
      filePath,
      fileSize: info.size,
      fileModifiedMs: info.mtimeMs,
      partSize: partSizeFor(info.size),
      uploadId: null,
      parts: []
    })
    return true
  }
}
