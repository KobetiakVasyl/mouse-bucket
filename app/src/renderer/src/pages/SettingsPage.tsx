// The Settings page: the theme, the defaults for uploads and restores, and the download folder. See docs/UI.md.
import { useState } from 'react'
import type { Settings, SettingsUpdate } from '../../../shared/types/settings-types'
import { THEME_OPTIONS } from '../constants/settings-constants'
import { ErrorMessage } from '../theme/components/ErrorMessage'
import { PageLayout } from '../theme/components/PageLayout'
import { Section } from '../theme/components/Section'
import { ToggleGroup } from '../theme/components/ToggleGroup'
import { DefaultsSettings } from '../theme/compositions/DefaultsSettings'
import { DownloadFolderSetting } from '../theme/compositions/DownloadFolderSetting'
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
    <PageLayout title="Settings" description="Changes are saved as soon as you make them.">
      <div className="space-y-12">
        <Section title="Appearance">
          <ToggleGroup
            label="Theme"
            options={THEME_OPTIONS}
            value={settings.theme}
            onChange={(theme) => change({ theme })}
          />
        </Section>
        <DefaultsSettings settings={settings} onChange={change} />
        <DownloadFolderSetting
          folder={settings.downloadFolder}
          busy={choosing}
          onChange={chooseDownloadFolder}
        />
      </div>
      <ErrorMessage message={error} />
    </PageLayout>
  )
}
