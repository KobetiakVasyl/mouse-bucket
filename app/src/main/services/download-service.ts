// Browses a download template's bucket, container or Drive folder, and downloads, deletes or restores its files. See
// docs/ARCHITECTURE.md.
import { stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type {
  DownloadRequest,
  FolderListing,
  FolderRequest,
  RestoreRequest
} from '../../shared/types/storage-types'
import { MAX_NAME_COPIES } from '../constants/file-name-constants'
import type { StorageAccess } from '../types/credential-types'
import { partPathOf } from '../utils/download-utils'
import { UserError } from '../utils/error-utils'
import { numberedName, saveNameFor } from '../utils/file-name-utils'
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
      'listFolder' | 'deleteFile' | 'restoreFile' | 'fileName'
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
    return name
  }

  async deleteFile({ templateId, key }: DownloadRequest): Promise<void> {
    await this.storage.deleteFile(await this.accessOf(templateId), key)
  }

  async restoreFile({ templateId, key, options }: RestoreRequest): Promise<void> {
    await this.storage.restoreFile(await this.accessOf(templateId), key, options)
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
