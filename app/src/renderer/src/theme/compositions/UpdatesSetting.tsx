// The running version, and checking for, downloading and installing an update, each only when asked. See docs/UI.md.
import { useState } from 'react'
import { updateService, useUpdateState } from '../../services/update-service'
import { messageOf } from '../../utils/error-utils'
import { Button } from '../components/Button'
import { ErrorMessage } from '../components/ErrorMessage'
import { ProgressBar } from '../components/ProgressBar'
import { CheckUpdatesIcon, DownloadIcon, InstallIcon } from '../components/icons'

export function UpdatesSetting({ version }: { version: string }): React.JSX.Element {
  const state = useUpdateState()
  const [error, setError] = useState<string>()
  const act = (action: Promise<unknown>): void => {
    setError(undefined)
    action.catch((reason: unknown) => setError(messageOf(reason)))
  }
  const check = (
    <Button
      disabled={state !== null && state.status === 'checking'}
      onClick={() => act(updateService.check())}
    >
      <CheckUpdatesIcon />
      Check for updates
    </Button>
  )

  return (
    <section aria-label="Updates">
      <h2 className="mb-3 text-xl font-semibold">Updates</h2>
      <p className="mb-3">Version {version}</p>
      {state !== null && state.status === 'unsupported' && (
        <p className="text-muted">Updates work only in an installed copy of the app.</p>
      )}
      {state !== null && state.status === 'idle' && check}
      {state !== null && state.status === 'checking' && (
        <>
          <p className="mb-3 text-muted">Checking GitHub for a newer version…</p>
          {check}
        </>
      )}
      {state !== null && state.status === 'current' && (
        <>
          <p className="mb-3 text-muted">This is the newest version.</p>
          {check}
        </>
      )}
      {state !== null && state.status === 'available' && (
        <>
          <p className="mb-3">Version {state.version} is available.</p>
          <Button variant="primary" onClick={() => act(updateService.download())}>
            <DownloadIcon />
            Download the update
          </Button>
        </>
      )}
      {state !== null && state.status === 'downloading' && (
        <div className="max-w-md">
          <p>
            Downloading version {state.version}… {state.percent}%
          </p>
          <ProgressBar value={state.percent} max={100} />
        </div>
      )}
      {state !== null && state.status === 'ready' && (
        <>
          <p className="mb-3">
            Version {state.version} is downloaded. Restarting installs it; running transfers pause
            and can be resumed after.
          </p>
          <Button variant="primary" onClick={() => act(updateService.install())}>
            <InstallIcon />
            Restart and install
          </Button>
        </>
      )}
      {state !== null && state.status === 'failed' && (
        <>
          <ErrorMessage message={state.error} />
          <div className="mt-3">{check}</div>
        </>
      )}
      <ErrorMessage message={error} />
    </section>
  )
}
