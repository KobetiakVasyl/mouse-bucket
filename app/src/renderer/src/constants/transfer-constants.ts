// The names of the transfer states. See docs/UI.md.
import type { TransferStatus } from '../../../shared/types/transfer-types'

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  queued: 'Waiting',
  running: 'In progress',
  done: 'Done',
  failed: 'Failed',
  cancelled: 'Cancelled'
}
