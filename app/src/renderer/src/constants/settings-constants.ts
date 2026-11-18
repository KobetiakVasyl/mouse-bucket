// The choices on the Settings page. See docs/UI.md.
import type { Theme } from '../../../shared/types/settings-types'
import type { ChoiceOption } from '../types/component-types'

export const THEME_OPTIONS: ChoiceOption<Theme>[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' }
]

// Used until main's saved theme arrives in the query string.
export const DEFAULT_THEME: Theme = 'dark'
