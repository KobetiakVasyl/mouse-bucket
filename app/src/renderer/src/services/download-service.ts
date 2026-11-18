// Browses a download template's bucket through main, and downloads, deletes or restores its files. See docs/ARCHITECTURE.md.
import type { Api } from '../../../shared/types/ipc-types'
import type {
  DownloadRequest,
  FolderListing,
  FolderRequest,
  RestoreRequest
} from '../../../shared/types/s3-types'

export class DownloadService {
  constructor(
    private readonly api: Pick<Api, 'listFolder' | 'downloadFile' | 'deleteFile' | 'restoreFile'>
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
}

export const downloadService = new DownloadService(window.api)
