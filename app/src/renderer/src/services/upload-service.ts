// Asks main to pick files or a folder, or to take dropped ones, and queue them for upload to a template. See docs/ARCHITECTURE.md.
import type { Api } from '../../../shared/types/ipc-types'
import type { UploadRequest } from '../../../shared/types/s3-types'

export class UploadService {
  constructor(
    private readonly api: Pick<
      Api,
      'chooseFilesToUpload' | 'chooseFolderToUpload' | 'uploadDroppedFiles'
    >
  ) {}

  // How many files main queued; 0 when the file picker was cancelled.
  chooseFiles(request: UploadRequest): Promise<number> {
    return this.api.chooseFilesToUpload(request)
  }

  // How many files main queued from the folder, at any depth; 0 when the picker was cancelled.
  chooseFolder(request: UploadRequest): Promise<number> {
    return this.api.chooseFolderToUpload(request)
  }

  // How many files main queued from what was dropped; 0 when nothing came from this computer.
  uploadDropped(request: UploadRequest, files: File[]): Promise<number> {
    return this.api.uploadDroppedFiles(request, files)
  }
}

export const uploadService = new UploadService(window.api)
