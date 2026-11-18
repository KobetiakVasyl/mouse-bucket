// Asks how fast to restore archived files and for how many days the copies stay, starting with the defaults from
// Settings. See docs/UI.md.
import { useState } from 'react'
import { RESTORE_DAYS } from '../../../../shared/constants/storage-constants'
import type { RestoreTier, S3File } from '../../../../shared/types/s3-types'
import { RESTORE_TIER_HINTS, RESTORE_TIER_OPTIONS } from '../../constants/download-constants'
import { fileCount, restoreTimesFor } from '../../utils/download-utils'
import { Button } from '../components/Button'
import { ErrorMessage } from '../components/ErrorMessage'
import { Modal } from '../components/Modal'
import { ToggleGroup } from '../components/ToggleGroup'
import { RestoreIcon } from '../components/icons'
import { RestoreDaysPicker } from './RestoreDaysPicker'

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
  const [days, setDays] = useState<number | null>(defaultDays)
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
        <ToggleGroup
          label="Speed"
          options={RESTORE_TIER_OPTIONS}
          value={tier}
          hint={
            times === undefined
              ? RESTORE_TIER_HINTS[tier]
              : `Usually ready ${times[tier]}. ${RESTORE_TIER_HINTS[tier]}`
          }
          onChange={setTier}
        />
        <RestoreDaysPicker
          label="Days to keep the copy"
          days={days}
          hint={`From ${RESTORE_DAYS.min} to ${RESTORE_DAYS.max}.`}
          onChange={setDays}
        />
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
