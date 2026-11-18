// The defaults new uploads and restores start with: the storage class, the restore speed and the days a restored copy
// stays. See docs/UI.md.
import { useState } from 'react'
import { RESTORE_DAYS } from '../../../../shared/constants/storage-constants'
import type { Settings, SettingsUpdate } from '../../../../shared/types/settings-types'
import { RESTORE_TIER_HINTS, RESTORE_TIER_OPTIONS } from '../../constants/download-constants'
import {
  UPLOAD_STORAGE_CLASS_HINTS,
  UPLOAD_STORAGE_CLASS_OPTIONS
} from '../../constants/storage-class-constants'
import { Section } from '../components/Section'
import { Select } from '../components/Select'
import { ToggleGroup } from '../components/ToggleGroup'
import { RestoreDaysPicker } from './RestoreDaysPicker'

export function DefaultsSettings({
  settings,
  onChange
}: {
  settings: Settings
  onChange: (update: SettingsUpdate) => void
}): React.JSX.Element {
  // Days that aren't valid yet show as such, and aren't saved.
  const [days, setDays] = useState<number | null>(settings.defaultRestoreDays)
  return (
    <Section title="Defaults" description="Uploads and restores start with these.">
      <div className="space-y-6">
        <Select
          label="Storage class for new uploads"
          options={UPLOAD_STORAGE_CLASS_OPTIONS}
          value={settings.defaultStorageClass}
          hint={`The Upload page starts with this, and can change it for each upload. ${UPLOAD_STORAGE_CLASS_HINTS[settings.defaultStorageClass]}`}
          onChange={(defaultStorageClass) => onChange({ defaultStorageClass })}
        />
        <ToggleGroup
          label="Restore speed"
          options={RESTORE_TIER_OPTIONS}
          value={settings.defaultRestoreTier}
          hint={`${RESTORE_TIER_HINTS[settings.defaultRestoreTier]} Each restore starts with this, and its dialog can change it.`}
          onChange={(defaultRestoreTier) => onChange({ defaultRestoreTier })}
        />
        <RestoreDaysPicker
          label="Days to keep a restored copy"
          days={days}
          hint={`From ${RESTORE_DAYS.min} to ${RESTORE_DAYS.max}. Each restore starts with this, and its dialog can change it.`}
          onChange={(next) => {
            setDays(next)
            if (next !== null) onChange({ defaultRestoreDays: next })
          }}
        />
      </div>
    </Section>
  )
}
