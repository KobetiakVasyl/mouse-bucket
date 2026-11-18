// An upload or download in the transfer queue, as main reports it to the page. See docs/ARCHITECTURE.md.
import type { TemplateKind } from './template-types'

export interface TransferDetails {
  kind: TemplateKind
  templateName: string
  name: string
  // 0 until the size is known, as for a download before S3 answers.
  bytesTotal: number
}

export interface TransferProgress extends TransferDetails {
  id: string
  bytesDone: number
}

// Only a failed transfer has an error message.
export type Transfer =
  | (TransferProgress & { status: 'queued' | 'running' | 'done' | 'cancelled' })
  | (TransferProgress & { status: 'failed'; error: string })

export type TransferStatus = Transfer['status']
