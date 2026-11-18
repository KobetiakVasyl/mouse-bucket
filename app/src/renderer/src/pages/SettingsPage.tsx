// The Settings page: the theme, the defaults for uploads and restores, the download folder, and updates. See docs/UI.md.
import { useState } from 'react'
import type { Settings, SettingsUpdate } from '../../../shared/types/settings-types'
import { THEME_OPTIONS } from '../constants/settings-constants'
import { ErrorMessage } from '../theme/components/ErrorMessage'
import { PageHeading } from '../theme/components/PageHeading'
import { ToggleGroup } from '../theme/components/ToggleGroup'
import { DefaultsSettings } from '../theme/compositions/DefaultsSettings'
import { DownloadFolderSetting } from '../theme/compositions/DownloadFolderSetting'
import { UpdatesSetting } from '../theme/compositions/UpdatesSetting'
import { messageOf } from '../utils/error-utils'

export function SettingsPage({
  settings,
  version,
  onChange,
  onChooseDownloadFolder
}: {
  settings: Settings
  version: string
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
      <div className="max-w-3xl space-y-10">
        <section aria-label="Appearance">
          <h2 className="mb-3 text-xl font-semibold">Appearance</h2>
          <ToggleGroup
            label="Theme"
            options={THEME_OPTIONS}
            value={settings.theme}
            onChange={(theme) => change({ theme })}
          />
        </section>
        <DefaultsSettings settings={settings} onChange={change} />
        <DownloadFolderSetting
          folder={settings.downloadFolder}
          busy={choosing}
          onChange={chooseDownloadFolder}
        />
        <UpdatesSetting version={version} />
      </div>
      <ErrorMessage message={error} />
    </>
  )
}
