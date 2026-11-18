// Asks main about updates: the state, checking, downloading and installing, and following its changes. See docs/PACKAGING.md.
import { useEffect, useState } from 'react'
import type { Api } from '../../../shared/types/ipc-types'
import type { UpdateState } from '../../../shared/types/update-types'

export class UpdateService {
  constructor(
    private readonly api: Pick<
      Api,
      'getUpdateStatus' | 'checkForUpdates' | 'downloadUpdate' | 'installUpdate' | 'onUpdateChanged'
    >
  ) {}

  status(): Promise<UpdateState> {
    return this.api.getUpdateStatus()
  }

  // Contacts GitHub; nothing else in the app does.
  check(): Promise<UpdateState> {
    return this.api.checkForUpdates()
  }

  download(): Promise<void> {
    return this.api.downloadUpdate()
  }

  // Main quits the app and starts the installer.
  install(): Promise<void> {
    return this.api.installUpdate()
  }

  subscribe(listener: (state: UpdateState) => void): () => void {
    return this.api.onUpdateChanged(listener)
  }
}

export const updateService = new UpdateService(window.api)

// Keeps the state in step with main, which sends every change.
export function useUpdateState(): UpdateState | null {
  const [state, setState] = useState<UpdateState | null>(null)
  useEffect(() => {
    let current = true
    void updateService.status().then((status) => {
      if (current) setState(status)
    })
    const unsubscribe = updateService.subscribe(setState)
    return () => {
      current = false
      unsubscribe()
    }
  }, [])
  return state
}
