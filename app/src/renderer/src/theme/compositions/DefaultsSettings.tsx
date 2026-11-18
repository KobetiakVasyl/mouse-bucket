// The defaults new uploads and restores start with: the storage class, the restore speed and the days a restored copy stays. See docs/UI.md.
import { useState } from 'react'
import { RESTORE_DAYS } from '../../../../shared/constants/storage-constants'
import type { Settings, SettingsUpdate } from '../../../../shared/types/settings-types'
import { RESTORE_TIER_OPTIONS } from '../../constants/download-constants'
import {
  UPLOAD_STORAGE_CLASS_HINTS,
  UPLOAD_STORAGE_CLASS_OPTIONS
} from '../../constants/storage-class-constants'
import { parseRestoreDays } from '../../validation/restore-validation'
import { Field } from '../components/Field'
import { Select } from '../components/Select'
import { ToggleGroup } from '../components/ToggleGroup'
import { INPUT_CLASS } from '../styles/style-constants'

export function DefaultsSettings({
  settings,
  onChange
}: {
  settings: Settings
  onChange: (update: SettingsUpdate) => void
}): React.JSX.Element {
  const [daysText, setDaysText] = useState(String(settings.defaultRestoreDays))
  return (
    <section aria-label="Defaults">
      <h2 className="mb-3 text-xl font-semibold">Defaults</h2>
      <div className="space-y-6">
        <Select
          label="Storage class for new uploads"
          options={UPLOAD_STORAGE_CLASS_OPTIONS}
          value={settings.defaultStorageClass}
          hint={`The Upload page starts with this, and can change it for each upload. ${UPLOAD_STORAGE_CLASS_HINTS[settings.defaultStorageClass]}`}
          onChange={(defaultStorageClass) => onChange({ defaultStorageClass })}
        />
        <div>
          <ToggleGroup
            label="Restore speed"
            options={RESTORE_TIER_OPTIONS}
            value={settings.defaultRestoreTier}
            onChange={(defaultRestoreTier) => onChange({ defaultRestoreTier })}
          />
          <p className="mt-1 text-sm text-muted">
            Each restore starts with this, and its dialog can change it.
          </p>
        </div>
        <Field
          label="Days to keep a restored copy"
          hint={`From ${RESTORE_DAYS.min} to ${RESTORE_DAYS.max}. Each restore starts with this, and its dialog can change it.`}
        >
          <input
            className={`${INPUT_CLASS} max-w-32`}
            type="number"
            min={RESTORE_DAYS.min}
            max={RESTORE_DAYS.max}
            value={daysText}
            onChange={(event) => {
              setDaysText(event.target.value)
              const days = parseRestoreDays(event.target.value)
              if (days !== null) onChange({ defaultRestoreDays: days })
            }}
          />
        </Field>
      </div>
    </section>
  )
}
