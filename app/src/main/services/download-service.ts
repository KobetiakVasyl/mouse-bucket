// Browses a download template's bucket, and downloads, deletes or restores its files. See docs/ARCHITECTURE.md.
import { stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type {
  DownloadRequest,
  FolderListing,
  FolderRequest,
  RestoreRequest
} from '../../shared/types/s3-types'
import { MAX_NAME_COPIES } from '../constants/file-name-constants'
import { PART_FILE_SUFFIX } from '../constants/s3-constants'
import type { BucketAccess } from '../types/credential-types'
import { UserError } from '../utils/error-utils'
import { numberedName, saveNameFor } from '../utils/file-name-utils'
import { pathExists } from '../utils/file-utils'
import type { S3Service } from './s3-service'
import type { SettingsService } from './settings-service'
import type { TemplateService } from './template-service'
import type { TransferService } from './transfer-service'

export class DownloadService {
  constructor(
    private readonly templates: Pick<TemplateService, 'getOfKind' | 'accessFor'>,
    private readonly s3: Pick<S3Service, 'listFolder' | 'deleteFile' | 'restoreFile'>,
    private readonly transfers: Pick<TransferService, 'add' | 'downloadTargets'>,
    private readonly settings: Pick<SettingsService, 'get'>
  ) {}

  async listFolder({
    templateId,
    prefix,
    continuationToken
  }: FolderRequest): Promise<FolderListing> {
    return this.s3.listFolder(await this.bucketOf(templateId), prefix, continuationToken)
  }

  // Saves into the download folder from Settings, under a safe name from the key that no other file has. Returns that name.
  async downloadFile({ templateId, key }: DownloadRequest): Promise<string> {
    const template = await this.templates.getOfKind(templateId, 'download')
    const { downloadFolder } = await this.settings.get()
    await this.checkFolder(downloadFolder)
    const targetPath = await this.freePath(downloadFolder, saveNameFor(key))
    const name = basename(targetPath)
    this.transfers.add({
      kind: 'download',
      templateId: template.id,
      templateName: template.name,
      bucket: template.bucket,
      region: template.region,
      key,
      name,
      targetPath,
      etag: null,
      bytesTotal: null
    })
    return name
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
      if (await pathExists(`${candidate}${PART_FILE_SUFFIX}`)) continue
      return candidate
    }
    throw new UserError(`The download folder already has too many files named ${name}.`)
  }
}
