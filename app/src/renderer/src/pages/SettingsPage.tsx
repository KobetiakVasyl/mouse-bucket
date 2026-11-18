// The Settings page: for now, the dark or light theme. See docs/UI.md.
import { useState } from 'react'
import type { Settings, SettingsUpdate, Theme } from '../../../shared/ipc'
import { messageOf } from '../api'
import { ErrorMessage, PageHeading, ToggleGroup } from '../components/ui'

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
        options={[
          { value: 'dark', label: 'Dark' },
          { value: 'light', label: 'Light' }
        ]}
        value={settings.theme}
        onChange={changeTheme}
      />
      <ErrorMessage message={error} />
    </>
  )
}
