// The settings a new install starts with; the download folder is the system's Downloads folder. See docs/UI.md.
import type { Settings } from '../../shared/types/settings-types'

export const DEFAULT_SETTINGS: Omit<Settings, 'downloadFolder'> = {
  theme: 'dark',
  welcomeSeen: false,
  defaultStorageClass: 'DEEP_ARCHIVE'
}
