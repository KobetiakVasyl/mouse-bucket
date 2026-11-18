// Queues files for upload to an upload template's folder on its platform: picked files, a picked folder, or files and
// folders dropped on the page. See docs/ARCHITECTURE.md.
import type { Stats } from 'node:fs'
import { stat } from 'node:fs/promises'
import { basename, isAbsolute, relative, sep } from 'node:path'
import type { WebContents } from 'electron'
import type {
  UploadClass,
  UploadPathsRequest,
  UploadRequest
} from '../../shared/types/storage-types'
import type { Template } from '../../shared/types/template-types'
import { listFiles } from '../utils/file-utils'
import { partSizeFor } from '../utils/part-utils'
import { checkUploadClass, placeOf } from '../utils/storage-utils'
import type { DialogService } from './dialog-service'
import type { TemplateService } from './template-service'
import type { TransferService } from './transfer-service'

export class UploadService {
  constructor(
    private readonly templates: Pick<TemplateService, 'getOfKind'>,
    private readonly transfers: Pick<TransferService, 'add'>,
    private readonly dialogs: Pick<DialogService, 'chooseFiles' | 'chooseFolder'>
  ) {}

  // Main opens the file picker itself, so the page never handles a local path. Returns how many files were queued.
  async chooseFiles(
    { templateId, storageClass }: UploadRequest,
    sender: WebContents
  ): Promise<number> {
    const template = await this.uploadTemplate(templateId, storageClass)
    const filePaths = await this.dialogs.chooseFiles(sender, `Upload to ${template.name}`)
    return this.queuePaths(template, storageClass, filePaths)
  }

  async chooseFolder(
    { templateId, storageClass }: UploadRequest,
    sender: WebContents
  ): Promise<number> {
    const template = await this.uploadTemplate(templateId, storageClass)
    const folder = await this.dialogs.chooseFolder(sender, `Upload a folder to ${template.name}`)
    return folder === null ? 0 : this.queuePaths(template, storageClass, [folder])
  }

  // Files and folders dropped on the page. The preload read their paths from the dropped files, so they're ones the user chose.
  async uploadPaths({ templateId, storageClass, paths }: UploadPathsRequest): Promise<number> {
    const template = await this.uploadTemplate(templateId, storageClass)
    return this.queuePaths(template, storageClass, paths)
  }

  // The storage class must be one the template's platform has, before any picker opens.
  private async uploadTemplate(templateId: string, storageClass: UploadClass): Promise<Template> {
    const template = await this.templates.getOfKind(templateId, 'upload')
    checkUploadClass(template.platform, storageClass)
    return template
  }

  // A file keeps its name. A folder keeps its name too, with each file at its path inside it.
  // Anything but files and folders is skipped, and so are links inside a folder.
  private async queuePaths(
    template: Template,
    storageClass: UploadClass,
    paths: string[]
  ): Promise<number> {
    let queued = 0
    for (const path of paths) {
      if (!isAbsolute(path)) continue
      const info = await stat(path).catch(() => null)
      if (info === null) continue
      if (info.isFile()) {
        this.queue(template, storageClass, path, basename(path), info)
        queued++
      } else if (info.isDirectory()) {
        for (const file of await listFiles(path)) {
          const inFolder = relative(path, file.path).split(sep).join('/')
          this.queue(template, storageClass, file.path, `${basename(path)}/${inFolder}`, file.info)
          queued++
        }
      }
    }
    return queued
  }

  private queue(
    template: Template,
    storageClass: UploadClass,
    filePath: string,
    name: string,
    info: Stats
  ): void {
    this.transfers.add({
      kind: 'upload',
      templateId: template.id,
      templateName: template.name,
      place: placeOf(template),
      // On Google Drive, the path inside the template's folder; elsewhere, the full key or blob name.
      key: template.platform === 'google-drive' ? name : `${template.prefix}${name}`,
      name,
      storageClass,
      filePath,
      fileSize: info.size,
      fileModifiedMs: info.mtimeMs,
      partSize: partSizeFor(info.size),
      uploadId: null,
      parts: []
    })
  }
}
