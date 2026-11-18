// Asks main to pick files and queue them for upload to a template. See docs/ARCHITECTURE.md.
import type { Api } from '../../../shared/types/ipc-types'

export class UploadService {
  constructor(private readonly api: Pick<Api, 'chooseFilesToUpload'>) {}

  // How many files main queued; 0 when the file picker was cancelled.
  chooseFiles(templateId: string): Promise<number> {
    return this.api.chooseFilesToUpload(templateId)
  }
}

export const uploadService = new UploadService(window.api)
