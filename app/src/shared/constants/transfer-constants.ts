// Which transfer states are still pending, and which can be resumed, for main's queue and the page's buttons. See docs/ARCHITECTURE.md.
import type { TransferStatus } from '../types/transfer-types'

export const PENDING_STATUSES: ReadonlySet<TransferStatus> = new Set([
  'queued',
  'running',
  'retrying'
])

export const RESUMABLE_STATUSES: ReadonlySet<TransferStatus> = new Set(['paused', 'failed'])
