// Describes a transfer in the transfers list: its title, its one-line summary, and whether it's pending. See docs/UI.md.
import type { TemplateKind } from '../../../shared/types/template-types'
import type { Transfer } from '../../../shared/types/transfer-types'
import { TEMPLATE_KIND_LABELS } from '../constants/template-constants'
import { PENDING_STATUSES } from '../../../shared/constants/transfer-constants'
import { TRANSFER_STATUS_LABELS } from '../constants/transfer-constants'
import { formatBytes } from './format-utils'

export function isPending(transfer: Transfer): boolean {
  return PENDING_STATUSES.has(transfer.status)
}

export function transferTitle(transfer: Transfer): string {
  return `${TEMPLATE_KIND_LABELS[transfer.kind]}: ${transfer.name}`
}

// The template, status and size, then the error of a failed transfer.
export function transferSummary(transfer: Transfer): string {
  const size =
    transfer.bytesTotal === 0
      ? formatBytes(transfer.bytesDone)
      : `${formatBytes(transfer.bytesDone)} of ${formatBytes(transfer.bytesTotal)}`
  const parts = [transfer.templateName, TRANSFER_STATUS_LABELS[transfer.status], size]
  return (transfer.status === 'failed' ? [...parts, transfer.error] : parts).join(' · ')
}

export function transfersOfKind(transfers: Transfer[], kind: TemplateKind): Transfer[] {
  return transfers.filter((transfer) => transfer.kind === kind)
}
