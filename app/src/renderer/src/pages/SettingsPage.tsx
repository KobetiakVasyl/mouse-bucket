// The Settings page: the dark or light theme, and the storage class uploads start with. See docs/UI.md.
import { useState } from 'react'
import type { Settings, SettingsUpdate } from '../../../shared/types/settings-types'
import { THEME_OPTIONS } from '../constants/settings-constants'
import {
  UPLOAD_STORAGE_CLASS_HINTS,
  UPLOAD_STORAGE_CLASS_OPTIONS
} from '../constants/storage-class-constants'
import { ErrorMessage } from '../theme/components/ErrorMessage'
import { PageHeading } from '../theme/components/PageHeading'
import { ToggleGroup } from '../theme/components/ToggleGroup'
import { messageOf } from '../utils/error-utils'

export function SettingsPage({
  settings,
  onChange
}: {
  settings: Settings
  onChange: (update: SettingsUpdate) => Promise<void>
}): React.JSX.Element {
  const [error, setError] = useState<string>()
  const change = (update: SettingsUpdate): void => {
    setError(undefined)
    onChange(update).catch((reason: unknown) => setError(messageOf(reason)))
  }
  return (
    <>
      <PageHeading title="Settings" />
      <div className="max-w-3xl space-y-6">
        <ToggleGroup
          label="Theme"
          options={THEME_OPTIONS}
          value={settings.theme}
          onChange={(theme) => change({ theme })}
        />
        <div>
          <ToggleGroup
            label="Storage class for new uploads"
            options={UPLOAD_STORAGE_CLASS_OPTIONS}
            value={settings.defaultStorageClass}
            onChange={(defaultStorageClass) => change({ defaultStorageClass })}
          />
          <p className="mt-1 text-sm text-muted">
            The Upload page starts with this; you can still change it there for each upload.{' '}
            {UPLOAD_STORAGE_CLASS_HINTS[settings.defaultStorageClass]}
          </p>
        </div>
      </div>
      <ErrorMessage message={error} />
    </>
  )
}
