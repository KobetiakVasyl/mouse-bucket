// The updates dialog, opened from the side menu: the running version, a check for a newer one as it opens, then
// downloading and installing it, each only when asked. See docs/UI.md.
import { useEffect, useRef, useState } from 'react'
import { CHECK_ON_OPEN } from '../../constants/update-constants'
import { updateService, useUpdateState } from '../../services/update-service'
import { messageOf } from '../../utils/error-utils'
import { Button } from '../components/Button'
import { ErrorMessage } from '../components/ErrorMessage'
import { Modal } from '../components/Modal'
import { ProgressBar } from '../components/ProgressBar'
import { CheckUpdatesIcon, DownloadIcon, InstallIcon } from '../components/icons'

export function UpdatesDialog({
  version,
  onClose
}: {
  version: string
  onClose: () => void
}): React.JSX.Element {
  const state = useUpdateState()
  const [error, setError] = useState<string>()
  const checkedRef = useRef(false)
  const act = (action: Promise<unknown>): void => {
    setError(undefined)
    action.catch((reason: unknown) => setError(messageOf(reason)))
  }

  // Checks once, as soon as main says where updates stand.
  useEffect(() => {
    if (state === null || checkedRef.current) return
    checkedRef.current = true
    if (CHECK_ON_OPEN.has(state.status)) {
      updateService.check().catch((reason: unknown) => setError(messageOf(reason)))
    }
  }, [state])

  const checkAgain = (
    <Button onClick={() => act(updateService.check())}>
      <CheckUpdatesIcon />
      Check again
    </Button>
  )
  const close = (
    <Button onClick={onClose} autoFocus>
      Close
    </Button>
  )

  return (
    <Modal title="Updates" onClose={onClose}>
      <p className="mb-4">MouseBucket {version}</p>
      <div aria-live="polite" className="mb-6">
        {(state === null || state.status === 'idle' || state.status === 'checking') && (
          <p className="text-muted">Checking GitHub for a newer version…</p>
        )}
        {state !== null && state.status === 'unsupported' && (
          <p className="text-muted">Updates work only in an installed copy of the app.</p>
        )}
        {state !== null && state.status === 'current' && (
          <p className="text-muted">This is the newest version.</p>
        )}
        {state !== null && state.status === 'available' && (
          <p>Version {state.version} is available.</p>
        )}
        {state !== null && state.status === 'downloading' && (
          <>
            <p>
              Downloading version {state.version}… {state.percent}%
            </p>
            <ProgressBar value={state.percent} max={100} />
          </>
        )}
        {state !== null && state.status === 'ready' && (
          <p>
            Version {state.version} is downloaded. Restarting installs it; running transfers pause
            and can be resumed after.
          </p>
        )}
        {state !== null && state.status === 'failed' && <ErrorMessage message={state.error} />}
      </div>
      <div className="flex flex-wrap justify-end gap-3">
        {close}
        {state !== null && (state.status === 'current' || state.status === 'failed') && checkAgain}
        {state !== null && state.status === 'available' && (
          <Button variant="primary" onClick={() => act(updateService.download())}>
            <DownloadIcon />
            Download the update
          </Button>
        )}
        {state !== null && state.status === 'ready' && (
          <Button variant="primary" onClick={() => act(updateService.install())}>
            <InstallIcon />
            Restart and install
          </Button>
        )}
      </div>
      <ErrorMessage message={error} />
    </Modal>
  )
}
