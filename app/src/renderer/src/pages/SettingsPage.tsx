// The Settings page: for now, the dark or light theme. See docs/UI.md.
import { useState } from 'react'
import type { Settings, SettingsUpdate, Theme } from '../../../shared/types/settings-types'
import { THEME_OPTIONS } from '../constants/settings-constants'
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
  const changeTheme = (theme: Theme): void => {
    setError(undefined)
    onChange({ theme }).catch((reason: unknown) => setError(messageOf(reason)))
  }
  return (
    <>
      <PageHeading title="Settings" />
      <ToggleGroup
        label="Theme"
        options={THEME_OPTIONS}
        value={settings.theme}
        onChange={changeTheme}
      />
      <ErrorMessage message={error} />
    </>
  )
}
