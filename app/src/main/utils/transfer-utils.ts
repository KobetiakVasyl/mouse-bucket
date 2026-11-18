// What the page shows of a transfer record: its kind, template, file name and size. See docs/ARCHITECTURE.md.
import type { TransferDetails } from '../../shared/types/transfer-types'
import type { TransferRecord } from '../types/transfer-queue-types'

// A download's size is 0 until S3 names it.
export function transferDetailsOf(record: TransferRecord): TransferDetails {
  const bytesTotal =
    record.kind === 'upload' ? record.fileSize : record.bytesTotal === null ? 0 : record.bytesTotal
  return { kind: record.kind, templateName: record.templateName, name: record.name, bytesTotal }
}
