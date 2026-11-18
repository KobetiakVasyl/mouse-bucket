// Asks which tier to move archived Azure blobs into, and how fast, so they can be downloaded. See docs/UI.md.
import { useState } from 'react'
import type {
  RehydratePriority,
  RehydrateTier,
  StoredFile
} from '../../../../shared/types/storage-types'
import {
  REHYDRATE_DEFAULTS,
  REHYDRATE_PRIORITY_HINTS,
  REHYDRATE_PRIORITY_OPTIONS,
  REHYDRATE_TIER_OPTIONS
} from '../../constants/download-constants'
import { ACCESS_TIER_HINTS } from '../../constants/storage-class-constants'
import { fileCount } from '../../utils/download-utils'
import { Button } from '../components/Button'
import { ErrorMessage } from '../components/ErrorMessage'
import { Modal } from '../components/Modal'
import { ToggleGroup } from '../components/ToggleGroup'
import { RestoreIcon } from '../components/icons'

export function RehydrateDialog({
  files,
  busy,
  error,
  onRestore,
  onCancel
}: {
  files: StoredFile[]
  busy: boolean
  error: string | undefined
  onRestore: (tier: RehydrateTier, priority: RehydratePriority) => void
  onCancel: () => void
}): React.JSX.Element {
  const [tier, setTier] = useState<RehydrateTier>(REHYDRATE_DEFAULTS.tier)
  const [priority, setPriority] = useState<RehydratePriority>(REHYDRATE_DEFAULTS.priority)
  return (
    <Modal title="Restore from the archive" onClose={onCancel}>
      <p className="mb-6">
        Azure moves <strong>{files.length === 1 ? files[0].name : fileCount(files.length)}</strong>{' '}
        out of the Archive tier into the tier you choose, where {files.length === 1 ? 'it' : 'they'}{' '}
        can be downloaded and {files.length === 1 ? 'stays' : 'stay'} until changed. Azure charges
        for each rehydration.
      </p>
      <div className="space-y-5">
        <ToggleGroup
          label="Tier"
          options={REHYDRATE_TIER_OPTIONS}
          value={tier}
          hint={ACCESS_TIER_HINTS[tier]}
          onChange={setTier}
        />
        <ToggleGroup
          label="Priority"
          options={REHYDRATE_PRIORITY_OPTIONS}
          value={priority}
          hint={REHYDRATE_PRIORITY_HINTS[priority]}
          onChange={setPriority}
        />
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button onClick={onCancel} autoFocus>
          Cancel
        </Button>
        <Button variant="positive" disabled={busy} onClick={() => onRestore(tier, priority)}>
          <RestoreIcon />
          Restore
        </Button>
      </div>
      <ErrorMessage message={error} />
    </Modal>
  )
}
