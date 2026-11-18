// Asks how fast to restore archived files and for how many days the copies stay, starting with the defaults from Settings. See docs/UI.md.
import { useState } from 'react'
import { RESTORE_DAYS } from '../../../../shared/constants/storage-constants'
import type { RestoreTier, S3File } from '../../../../shared/types/s3-types'
import { RESTORE_TIER_OPTIONS } from '../../constants/download-constants'
import { fileCount, restoreTimesFor } from '../../utils/download-utils'
import { parseRestoreDays } from '../../validation/restore-validation'
import { Button } from '../components/Button'
import { ErrorMessage } from '../components/ErrorMessage'
import { Field } from '../components/Field'
import { Modal } from '../components/Modal'
import { ToggleGroup } from '../components/ToggleGroup'
import { INPUT_CLASS } from '../styles/style-constants'
import { RestoreIcon } from '../components/icons'

export function RestoreDialog({
  files,
  defaultTier,
  defaultDays,
  busy,
  error,
  onRestore,
  onCancel
}: {
  files: S3File[]
  defaultTier: RestoreTier
  defaultDays: number
  busy: boolean
  error: string | undefined
  onRestore: (tier: RestoreTier, days: number) => void
  onCancel: () => void
}): React.JSX.Element {
  const [tier, setTier] = useState<RestoreTier>(defaultTier)
  const [daysText, setDaysText] = useState(String(defaultDays))
  const days = parseRestoreDays(daysText)
  const times = restoreTimesFor(files)
  return (
    <Modal title="Restore from the archive" onClose={onCancel}>
      <p className="mb-6">
        {files.length === 1 ? (
          <>
            S3 makes a temporary copy of <strong>{files[0].name}</strong> that can be downloaded.
          </>
        ) : (
          <>
            S3 makes temporary copies of <strong>{fileCount(files.length)}</strong> that can be
            downloaded.
          </>
        )}{' '}
        AWS charges for each restore.
      </p>
      <div className="space-y-5">
        <div>
          <ToggleGroup
            label="Speed"
            options={RESTORE_TIER_OPTIONS}
            value={tier}
            onChange={setTier}
          />
          {times !== undefined && (
            <p className="mt-1 text-sm text-muted">Usually ready {times[tier]}.</p>
          )}
        </div>
        <Field
          label="Days to keep the copy"
          hint={`From ${RESTORE_DAYS.min} to ${RESTORE_DAYS.max}.`}
        >
          <input
            className={INPUT_CLASS}
            type="number"
            min={RESTORE_DAYS.min}
            max={RESTORE_DAYS.max}
            value={daysText}
            onChange={(event) => setDaysText(event.target.value)}
          />
        </Field>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button onClick={onCancel} autoFocus>
          Cancel
        </Button>
        <Button
          variant="positive"
          disabled={days === null || busy}
          onClick={() => {
            if (days !== null) onRestore(tier, days)
          }}
        >
          <RestoreIcon />
          Restore
        </Button>
      </div>
      <ErrorMessage message={error} />
    </Modal>
  )
}
