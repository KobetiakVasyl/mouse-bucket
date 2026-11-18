// Tailwind classes that several components share, using only the theme's color roles. See docs/UI.md.
import type { ButtonVariant } from '../../types/component-types'

export const FOCUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

export const INPUT_CLASS = `w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-muted hover:border-muted focus:border-ink disabled:pointer-events-none disabled:opacity-50 ${FOCUS}`

// The only colors: red for actions that delete something, and green for restoring.
export const BUTTON_LOOKS: Record<ButtonVariant, string> = {
  primary: 'border-ink bg-ink text-paper hover:opacity-85',
  secondary: 'border-line bg-surface text-ink hover:border-muted hover:bg-hover',
  danger: 'border-danger bg-surface text-danger hover:bg-danger hover:text-paper',
  positive: 'border-positive bg-surface text-positive hover:bg-positive hover:text-paper'
}

export const LINK_CLASS =
  'inline-flex items-center gap-2 rounded text-left underline hover:no-underline'

export const TABLE_HEAD_ROW = 'border-b border-line text-left text-sm text-muted'
export const TABLE_ROW = 'border-b border-line last:border-b-0 hover:bg-hover'
export const CELL = 'px-4 py-2.5'

export const PROGRESS_CLASS =
  'mt-2 h-2 w-full appearance-none overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-hover [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-ink'

export const MENU_ITEM_CLASS = `flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-lg ${FOCUS}`
