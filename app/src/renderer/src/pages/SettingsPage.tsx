// The Settings page: the dark or light theme, the storage class uploads start with, and the download folder. See docs/UI.md.
import { useState } from 'react'
import type { Settings, SettingsUpdate } from '../../../shared/types/settings-types'
import { THEME_OPTIONS } from '../constants/settings-constants'
import {
  UPLOAD_STORAGE_CLASS_HINTS,
  UPLOAD_STORAGE_CLASS_OPTIONS
} from '../constants/storage-class-constants'
import { ErrorMessage } from '../theme/components/ErrorMessage'
import { DownloadFolderSetting } from '../theme/compositions/DownloadFolderSetting'
import { PageHeading } from '../theme/components/PageHeading'
import { ToggleGroup } from '../theme/components/ToggleGroup'
import { messageOf } from '../utils/error-utils'

export function SettingsPage({
  settings,
  onChange,
  onChooseDownloadFolder
}: {
  settings: Settings
  onChange: (update: SettingsUpdate) => Promise<void>
  onChooseDownloadFolder: () => Promise<void>
}): React.JSX.Element {
  const [error, setError] = useState<string>()
  const [choosing, setChoosing] = useState(false)
  const chooseDownloadFolder = (): void => {
    setError(undefined)
    setChoosing(true)
    onChooseDownloadFolder()
      .catch((reason: unknown) => setError(messageOf(reason)))
      .finally(() => setChoosing(false))
  }
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
        <DownloadFolderSetting
          folder={settings.downloadFolder}
          busy={choosing}
          onChange={chooseDownloadFolder}
        />
      </div>
      <ErrorMessage message={error} />
    </>
  )
}
