// The uploads and downloads of this session, with their progress and a Cancel button while pending. See docs/UI.md.
import { useState } from 'react'
import type { Transfer } from '../../../../shared/types/transfer-types'
import { transferService } from '../../services/transfer-service'
import { messageOf } from '../../utils/error-utils'
import { isPending, transferSummary, transferTitle } from '../../utils/transfer-utils'
import { Button } from '../components/Button'
import { ErrorMessage } from '../components/ErrorMessage'
import { ProgressBar } from '../components/ProgressBar'

export function TransferList({ transfers }: { transfers: Transfer[] }): React.JSX.Element | null {
  const [error, setError] = useState<string>()
  if (transfers.length === 0) return null
  const cancel = (transfer: Transfer): void => {
    setError(undefined)
    transferService.cancel(transfer.id).catch((reason: unknown) => setError(messageOf(reason)))
  }

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-xl font-semibold">Transfers</h2>
      <ul className="rounded-xl border border-line bg-surface">
        {transfers.map((transfer) => (
          <li
            key={transfer.id}
            className="flex items-center gap-4 border-b border-line px-4 py-3 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate">{transferTitle(transfer)}</p>
              <p className="text-sm text-muted">{transferSummary(transfer)}</p>
              {isPending(transfer) && (
                // Before the size is known, the bar shows activity without an amount.
                <ProgressBar
                  value={transfer.bytesDone}
                  max={transfer.bytesTotal === 0 ? null : transfer.bytesTotal}
                />
              )}
            </div>
            {isPending(transfer) && (
              <Button className="text-sm" onClick={() => cancel(transfer)}>
                Cancel
              </Button>
            )}
          </li>
        ))}
      </ul>
      <ErrorMessage message={error} />
    </section>
  )
}
