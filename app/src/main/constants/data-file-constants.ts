// The app's own files in its data folder. See docs/ENVIRONMENTS.md.
export const DATA_FILES = {
  settings: 'settings.json',
  templates: 'templates.json',
  credentials: 'credentials.bin',
  windowState: 'window-state.json'
} as const

// Each file is written here first, then renamed over the old one.
export const TEMPORARY_SUFFIX = '.tmp'
