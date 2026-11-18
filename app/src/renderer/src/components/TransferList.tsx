// The uploads and downloads of this session, with their progress and a Cancel button while pending. See docs/UI.md.
import { useEffect, useState } from 'react'
import type { Transfer, TransferStatus } from '../../../shared/ipc'
import { api, messageOf } from '../api'
import { formatBytes } from '../format'
import { Button, ErrorMessage } from './ui'

const STATUS_LABELS: Record<TransferStatus, string> = {
  queued: 'Waiting',
  running: 'In progress',
  done: 'Done',
  failed: 'Failed',
  cancelled: 'Cancelled'
}

const PENDING: ReadonlySet<TransferStatus> = new Set(['queued', 'running'])

const PROGRESS_CLASS =
  'mt-2 h-2 w-full appearance-none overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-hover [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-ink'

// Keeps the list in step with main, which sends every change.
export function useTransfers(): Transfer[] {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  useEffect(() => {
    let current = true
    void api.listTransfers().then((list) => {
      if (current) setTransfers(list)
    })
    const unsubscribe = api.onTransfersChanged(setTransfers)
    return () => {
      current = false
      unsubscribe()
    }
  }, [])
  return transfers
}

function summary(transfer: Transfer): string {
  const size =
    transfer.bytesTotal === 0
      ? formatBytes(transfer.bytesDone)
      : `${formatBytes(transfer.bytesDone)} of ${formatBytes(transfer.bytesTotal)}`
  const parts = [transfer.templateName, STATUS_LABELS[transfer.status], size]
  return (transfer.status === 'failed' ? [...parts, transfer.error] : parts).join(' · ')
}

// Before the size is known, the bar shows activity without an amount.
function ProgressBar({ transfer }: { transfer: Transfer }): React.JSX.Element {
  if (transfer.bytesTotal === 0) return <progress className={PROGRESS_CLASS} />
  return (
    <progress className={PROGRESS_CLASS} value={transfer.bytesDone} max={transfer.bytesTotal} />
  )
}

export function TransferList({ transfers }: { transfers: Transfer[] }): React.JSX.Element | null {
  const [error, setError] = useState<string>()
  if (transfers.length === 0) return null
  const run = (action: Promise<void>): void => {
    setError(undefined)
    action.catch((reason: unknown) => setError(messageOf(reason)))
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
              <p className="truncate">
                {transfer.kind === 'upload' ? 'Upload' : 'Download'}: {transfer.name}
              </p>
              <p className="text-sm text-muted">{summary(transfer)}</p>
              {PENDING.has(transfer.status) && <ProgressBar transfer={transfer} />}
            </div>
            {PENDING.has(transfer.status) && (
              <Button className="text-sm" onClick={() => run(api.cancelTransfer(transfer.id))}>
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
