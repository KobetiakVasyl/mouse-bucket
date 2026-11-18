// Queues the files the user picks for upload to an upload template's folder. See docs/ARCHITECTURE.md.
import { stat } from 'node:fs/promises'
import { basename } from 'node:path'
import type { WebContents } from 'electron'
import type { UploadRequest, UploadStorageClass } from '../../shared/types/s3-types'
import type { Template } from '../../shared/types/template-types'
import type { DialogService } from './dialog-service'
import type { S3Service } from './s3-service'
import type { TemplateService } from './template-service'
import type { TransferService } from './transfer-service'

export class UploadService {
  constructor(
    private readonly templates: Pick<TemplateService, 'getOfKind' | 'accessFor'>,
    private readonly s3: Pick<S3Service, 'uploadFile'>,
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
      const info = await stat(filePath)
      if (!info.isFile()) continue
      this.queue(template, storageClass, filePath, info.size)
      queued++
    }
    return queued
  }

  // A file keeps its name: its key is the template's folder plus the name.
  private queue(
    template: Template,
    storageClass: UploadStorageClass,
    filePath: string,
    fileSize: number
  ): void {
    const name = basename(filePath)
    this.transfers.add(
      { kind: 'upload', templateName: template.name, name, bytesTotal: fileSize },
      async ({ signal, progress }) => {
        const access = await this.templates.accessFor(template)
        await this.s3.uploadFile(access, {
          key: `${template.prefix}${name}`,
          storageClass,
          filePath,
          fileSize,
          signal,
          onProgress: (bytesDone) => progress(bytesDone, fileSize)
        })
      }
    )
  }
}
