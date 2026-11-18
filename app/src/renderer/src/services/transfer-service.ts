// The uploads and downloads in main's queue: listing, cancelling, and following their changes. See docs/ARCHITECTURE.md.
import { useEffect, useState } from 'react'
import type { Api } from '../../../shared/types/ipc-types'
import type { Transfer } from '../../../shared/types/transfer-types'

export class TransferService {
  constructor(
    private readonly api: Pick<
      Api,
      'listTransfers' | 'pauseTransfer' | 'resumeTransfer' | 'cancelTransfer' | 'onTransfersChanged'
    >
  ) {}

  list(): Promise<Transfer[]> {
    return this.api.listTransfers()
  }

  pause(id: string): Promise<void> {
    return this.api.pauseTransfer(id)
  }

  // Continues a paused transfer, or tries a failed one again, from where it stopped.
  resume(id: string): Promise<void> {
    return this.api.resumeTransfer(id)
  }

  // Stops the transfer and deletes what it moved so far.
  cancel(id: string): Promise<void> {
    return this.api.cancelTransfer(id)
  }

  // Main sends the full list on every change. Returns the function that stops listening.
  subscribe(listener: (transfers: Transfer[]) => void): () => void {
    return this.api.onTransfersChanged(listener)
  }
}

export const transferService = new TransferService(window.api)

// Keeps the list in step with main.
export function useTransfers(): Transfer[] {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  useEffect(() => {
    let current = true
    void transferService.list().then((list) => {
      if (current) setTransfers(list)
    })
    const unsubscribe = transferService.subscribe(setTransfers)
    return () => {
      current = false
      unsubscribe()
    }
  }, [])
  return transfers
}
