// Browses a download template through main, and downloads, deletes or restores its files, one at a time or a whole
// folder at once. See docs/ARCHITECTURE.md.
import type { Api } from '../../../shared/types/ipc-types'
import type {
  DownloadRequest,
  FolderDownload,
  FolderListing,
  FolderRequest,
  FolderRestoreRequest,
  FolderSummary,
  FolderTargetRequest,
  RestoreRequest
} from '../../../shared/types/storage-types'

export class DownloadService {
  constructor(
    private readonly api: Pick<
      Api,
      | 'listFolder'
      | 'downloadFile'
      | 'deleteFile'
      | 'restoreFile'
      | 'summarizeFolder'
      | 'downloadFolder'
      | 'deleteFolder'
      | 'restoreFolder'
    >
  ) {}

  listFolder(request: FolderRequest): Promise<FolderListing> {
    return this.api.listFolder(request)
  }

  // The name main saves the file under in the download folder.
  download(request: DownloadRequest): Promise<string> {
    return this.api.downloadFile(request)
  }

  delete(request: DownloadRequest): Promise<void> {
    return this.api.deleteFile(request)
  }

  restore(request: RestoreRequest): Promise<void> {
    return this.api.restoreFile(request)
  }

  // How many files a folder holds at any depth, their size, and how many are archived.
  summarizeFolder(request: FolderTargetRequest): Promise<FolderSummary> {
    return this.api.summarizeFolder(request)
  }

  downloadFolder(request: FolderTargetRequest): Promise<FolderDownload> {
    return this.api.downloadFolder(request)
  }

  deleteFolder(request: FolderTargetRequest): Promise<void> {
    return this.api.deleteFolder(request)
  }

  // How many archived files inside a restore started for.
  restoreFolder(request: FolderRestoreRequest): Promise<number> {
    return this.api.restoreFolder(request)
  }
}

export const downloadService = new DownloadService(window.api)
