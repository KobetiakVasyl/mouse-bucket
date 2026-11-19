// Browses a download template's bucket, container or Drive folder, and downloads, deletes or restores its files, one at
// a time or a whole folder at once. See docs/ARCHITECTURE.md.
import { stat } from 'node:fs/promises'
import { basename, join, sep } from 'node:path'
import type {
  DownloadRequest,
  FolderDownload,
  FolderListing,
  FolderRequest,
  FolderRestoreRequest,
  FolderSummary,
  FolderTargetRequest,
  RestoreRequest
} from '../../shared/types/storage-types'
import type { Template } from '../../shared/types/template-types'
import { MAX_NAME_COPIES } from '../constants/file-name-constants'
import { DOWNLOADABLE_STATES } from '../constants/folder-constants'
import type { StorageAccess } from '../types/credential-types'
import { partPathOf } from '../utils/download-utils'
import { UserError } from '../utils/error-utils'
import { isInside, numberedName, saveNameFor } from '../utils/file-name-utils'
import { pathExists } from '../utils/file-utils'
import { placeOf } from '../utils/storage-utils'
import type { SettingsService } from './settings-service'
import type { StorageService } from './storage-service'
import type { TemplateService } from './template-service'
import type { TransferService } from './transfer-service'

export class DownloadService {
  constructor(
    private readonly templates: Pick<TemplateService, 'getOfKind' | 'accessFor'>,
    private readonly storage: Pick<
      StorageService,
      | 'listFolder'
      | 'deleteFile'
      | 'restoreFile'
      | 'fileName'
      | 'folderFiles'
      | 'folderName'
      | 'deleteFolder'
      | 'summarizeFolder'
      | 'restoreFolder'
    >,
    private readonly transfers: Pick<TransferService, 'add' | 'downloadTargets'>,
    private readonly settings: Pick<SettingsService, 'get'>
  ) {}

  async listFolder({
    templateId,
    folder,
    continuationToken
  }: FolderRequest): Promise<FolderListing> {
    return this.storage.listFolder(await this.accessOf(templateId), folder, continuationToken)
  }

  // Saves into the download folder from Settings, under a safe name from the file's name that no other file has.
  // Returns that name.
  async downloadFile({ templateId, key }: DownloadRequest): Promise<string> {
    const template = await this.templates.getOfKind(templateId, 'download')
    const access = await this.templates.accessFor(template)
    const fileName = await this.storage.fileName(access, key)
    const { downloadFolder } = await this.settings.get()
    await this.checkFolder(downloadFolder)
    const targetPath = await this.freePath(downloadFolder, saveNameFor(fileName))
    const name = basename(targetPath)
    this.queueDownload(template, key, name, targetPath)
    return name
  }

  async deleteFile({ templateId, key }: DownloadRequest): Promise<void> {
    await this.storage.deleteFile(await this.accessOf(templateId), key)
  }

  async restoreFile({ templateId, key, options }: RestoreRequest): Promise<void> {
    await this.storage.restoreFile(await this.accessOf(templateId), key, options)
  }

  async summarizeFolder({ templateId, folder }: FolderTargetRequest): Promise<FolderSummary> {
    return this.storage.summarizeFolder(await this.accessOf(templateId), folder)
  }

  // Queues each file of the folder that can be downloaded now into a folder of its name in the download folder, keeping
  // the folders inside it. A name that's taken there gets a number, such as photos (2). Each part of a path is made
  // safe, the result must stay inside that folder, and two names that end up the same get numbers too.
  async downloadFolder({ templateId, folder }: FolderTargetRequest): Promise<FolderDownload> {
    const template = await this.templates.getOfKind(templateId, 'download')
    const access = await this.templates.accessFor(template)
    const name = await this.storage.folderName(access, folder)
    const files = await this.storage.folderFiles(access, folder)
    const { downloadFolder } = await this.settings.get()
    await this.checkFolder(downloadFolder)
    const root = await this.freeFolder(downloadFolder, saveNameFor(name))
    const used = new Set<string>()
    let queued = 0
    for (const file of files) {
      if (!DOWNLOADABLE_STATES.has(file.access.state)) continue
      const parts = file.path
        .split('/')
        .filter((part) => part !== '')
        .map(saveNameFor)
      const targetPath = this.unusedPath(join(root, ...parts), used)
      if (targetPath === null || !isInside(root, targetPath)) continue
      this.queueDownload(template, file.key, `${basename(root)}/${parts.join('/')}`, targetPath)
      queued++
    }
    return { queued, skipped: files.length - queued, savedAs: basename(root) }
  }

  async deleteFolder({ templateId, folder }: FolderTargetRequest): Promise<void> {
    await this.storage.deleteFolder(await this.accessOf(templateId), folder)
  }

  async restoreFolder({ templateId, folder, options }: FolderRestoreRequest): Promise<number> {
    return this.storage.restoreFolder(await this.accessOf(templateId), folder, options)
  }

  private queueDownload(template: Template, key: string, name: string, targetPath: string): void {
    this.transfers.add({
      kind: 'download',
      templateId: template.id,
      templateName: template.name,
      place: placeOf(template),
      key,
      name,
      targetPath,
      etag: null,
      bytesTotal: null
    })
  }

  // The path itself, or its first numbered copy that no other file of this folder download took. Names compare
  // ignoring case, as on Windows.
  private unusedPath(path: string, used: Set<string>): string | null {
    for (let copy = 1; copy <= MAX_NAME_COPIES; copy++) {
      const candidate = copy === 1 ? path : join(path, '..', numberedName(basename(path), copy))
      if (used.has(candidate.toLowerCase())) continue
      used.add(candidate.toLowerCase())
      return candidate
    }
    return null
  }

  // A folder name that nothing in the download folder has yet, and no unfinished download goes into.
  private async freeFolder(folder: string, name: string): Promise<string> {
    const targets = this.transfers.downloadTargets().map((target) => target.toLowerCase())
    for (let copy = 1; copy <= MAX_NAME_COPIES; copy++) {
      const candidate = join(folder, copy === 1 ? name : `${name} (${copy})`)
      const inside = `${candidate.toLowerCase()}${sep}`
      if (
        targets.some((target) => target === candidate.toLowerCase() || target.startsWith(inside))
      ) {
        continue
      }
      if (await pathExists(candidate)) continue
      if (await pathExists(partPathOf(candidate))) continue
      return candidate
    }
    throw new UserError(`The download folder already has too many folders named ${name}.`)
  }

  private async accessOf(templateId: string): Promise<StorageAccess> {
    return this.templates.accessFor(await this.templates.getOfKind(templateId, 'download'))
  }

  private async checkFolder(folder: string): Promise<void> {
    const info = await stat(folder).catch(() => null)
    if (info === null || !info.isDirectory()) {
      throw new UserError(
        `The download folder ${folder} doesn't exist anymore. Choose another one in Settings.`
      )
    }
  }

  // The name itself, or the first numbered copy, such as report (2).pdf, that no file, partial download or unfinished
  // download uses. Names compare ignoring case, as on Windows.
  private async freePath(folder: string, name: string): Promise<string> {
    const taken = new Set(this.transfers.downloadTargets().map((target) => target.toLowerCase()))
    for (let copy = 1; copy <= MAX_NAME_COPIES; copy++) {
      const candidate = join(folder, numberedName(name, copy))
      if (taken.has(candidate.toLowerCase())) continue
      if (await pathExists(candidate)) continue
      if (await pathExists(partPathOf(candidate))) continue
      return candidate
    }
    throw new UserError(`The download folder already has too many files named ${name}.`)
  }
}
