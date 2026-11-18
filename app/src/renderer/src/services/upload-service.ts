// Asks main to pick files and queue them for upload to a template. See docs/ARCHITECTURE.md.
import type { Api } from '../../../shared/types/ipc-types'
import type { UploadRequest } from '../../../shared/types/s3-types'

export class UploadService {
  constructor(private readonly api: Pick<Api, 'chooseFilesToUpload'>) {}

  // How many files main queued; 0 when the file picker was cancelled.
  chooseFiles(request: UploadRequest): Promise<number> {
    return this.api.chooseFilesToUpload(request)
  }
}

export const uploadService = new UploadService(window.api)
