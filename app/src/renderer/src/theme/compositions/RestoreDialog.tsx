// Asks how fast to restore an archived file and for how many days the copy stays. See docs/UI.md.
import { useState } from 'react'
import { RESTORE_DAYS } from '../../../../shared/constants/storage-constants'
import type { RestoreTier, S3File } from '../../../../shared/types/s3-types'
import {
  DEFAULT_RESTORE_DAYS,
  DEFAULT_RESTORE_TIER,
  RESTORE_TIER_OPTIONS,
  RESTORE_TIMES
} from '../../constants/download-constants'
import { parseRestoreDays } from '../../validation/restore-validation'
import { Button } from '../components/Button'
import { ErrorMessage } from '../components/ErrorMessage'
import { Field } from '../components/Field'
import { Modal } from '../components/Modal'
import { ToggleGroup } from '../components/ToggleGroup'
import { INPUT_CLASS } from '../styles/style-constants'

export function RestoreDialog({
  file,
  busy,
  error,
  onRestore,
  onCancel
}: {
  file: S3File
  busy: boolean
  error: string | undefined
  onRestore: (tier: RestoreTier, days: number) => void
  onCancel: () => void
}): React.JSX.Element {
  const [tier, setTier] = useState<RestoreTier>(DEFAULT_RESTORE_TIER)
  const [daysText, setDaysText] = useState(DEFAULT_RESTORE_DAYS)
  const days = parseRestoreDays(daysText)
  const times = RESTORE_TIMES.get(file.storageClass)
  return (
    <Modal title="Restore from the archive" onClose={onCancel}>
      <p className="mb-6">
        S3 makes a temporary copy of <strong>{file.name}</strong> that can be downloaded. AWS
        charges for each restore.
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
          variant="primary"
          disabled={days === null || busy}
          onClick={() => {
            if (days !== null) onRestore(tier, days)
          }}
        >
          Restore
        </Button>
      </div>
      <ErrorMessage message={error} />
    </Modal>
  )
}
