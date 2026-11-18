// Which transfer states are still pending, for main's queue and the page's Cancel buttons. See docs/ARCHITECTURE.md.
import type { TransferStatus } from '../types/transfer-types'

export const PENDING_STATUSES: ReadonlySet<TransferStatus> = new Set(['queued', 'running'])
