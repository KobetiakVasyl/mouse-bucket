// The uploads and downloads, with their progress: Pause and Cancel while pending, Resume or Retry once stopped, at the
// right of each row. See docs/UI.md.
import { useState } from 'react'
import type { Transfer } from '../../../../shared/types/transfer-types'
import { transferService } from '../../services/transfer-service'
import { messageOf } from '../../utils/error-utils'
import {
  cancelLosesData,
  cancelWarning,
  isPending,
  isResumable,
  transferSummary,
  transferTitle
} from '../../utils/transfer-utils'
import { Button } from '../components/Button'
import { ErrorMessage } from '../components/ErrorMessage'
import { ProgressBar } from '../components/ProgressBar'
import { Section } from '../components/Section'
import { ConfirmDialog } from './ConfirmDialog'
import { CancelIcon, PauseIcon, ResumeIcon, RetryIcon } from '../components/icons'

export function TransferList({ transfers }: { transfers: Transfer[] }): React.JSX.Element | null {
  const [error, setError] = useState<string>()
  const [cancelling, setCancelling] = useState<Transfer | null>(null)
  if (transfers.length === 0) return null

  const act = (action: Promise<void>): void => {
    setError(undefined)
    action.catch((reason: unknown) => setError(messageOf(reason)))
  }
  const cancel = (transfer: Transfer): void => {
    if (cancelLosesData(transfer)) setCancelling(transfer)
    else act(transferService.cancel(transfer.id))
  }

  return (
    <Section
      title="Transfers"
      description="Uploads and downloads run in the background, and continue where they stopped."
      className="mt-12"
    >
      <ul className="rounded-xl border border-line bg-surface">
        {transfers.map((transfer) => (
          <li
            key={transfer.id}
            aria-label={transferTitle(transfer)}
            className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 border-b border-line px-4 py-3 last:border-b-0"
          >
            <div className="min-w-48 flex-1">
              <p className="truncate">{transferTitle(transfer)}</p>
              <p className="text-sm text-muted">{transferSummary(transfer)}</p>
              {(isPending(transfer) || isResumable(transfer)) && (
                // Before the size is known, the bar shows activity without an amount.
                <ProgressBar
                  value={transfer.bytesDone}
                  max={transfer.bytesTotal === 0 ? null : transfer.bytesTotal}
                />
              )}
            </div>
            <div className="flex gap-3">
              {isPending(transfer) && (
                <Button className="text-sm" onClick={() => act(transferService.pause(transfer.id))}>
                  <PauseIcon />
                  Pause
                </Button>
              )}
              {isResumable(transfer) && (
                <Button
                  className="text-sm"
                  onClick={() => act(transferService.resume(transfer.id))}
                >
                  {transfer.status === 'failed' ? <RetryIcon /> : <ResumeIcon />}
                  {transfer.status === 'failed' ? 'Retry' : 'Resume'}
                </Button>
              )}
              {(isPending(transfer) || isResumable(transfer)) && (
                <Button className="text-sm" onClick={() => cancel(transfer)}>
                  <CancelIcon />
                  Cancel
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <ErrorMessage message={error} />
      {cancelling !== null && (
        <ConfirmDialog
          title={`Cancel this ${cancelling.kind}?`}
          message={<p>{cancelWarning(cancelling)}</p>}
          confirmLabel={`Cancel ${cancelling.kind}`}
          confirmIcon={<CancelIcon />}
          cancelLabel="Keep it"
          busy={false}
          error={undefined}
          onConfirm={() => {
            act(transferService.cancel(cancelling.id))
            setCancelling(null)
          }}
          onCancel={() => setCancelling(null)}
        />
      )}
    </Section>
  )
}
